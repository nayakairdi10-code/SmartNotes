import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { SpeechToText } from './speech-to-text.js';

const firebaseConfig = {
  apiKey: "AIzaSyCKqgIPqkKMCfmghWZQfCqhMTSMQrrH15w",
  authDomain: "smartnotes-5c870.firebaseapp.com",
  projectId: "smartnotes-5c870",
  storageBucket: "smartnotes-5c870.firebasestorage.app",
  messagingSenderId: "1065552320223",
  appId: "1:1065552320223:web:d05896df85f441f29f3b6a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let notes = [];
let editId = null;

function showAuthMessage(msg, isError = true) {
    const el = document.getElementById('authMessage');
    el.style.color = isError ? '#f44336' : 'green';
    el.textContent = msg;
}

window.showRegister = function() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    document.getElementById('authMessage').textContent = '';
}

window.showLogin = function() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('authMessage').textContent = '';
}

window.register = async function() {
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    if (!email.includes('@gmail.com')) {
        showAuthMessage('Email harus mengandung @gmail.com');
        return;
    }
    if (password.length < 6) {
        showAuthMessage('Password minimal 6 karakter');
        return;
    }
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        showAuthMessage('Registrasi berhasil!', false);
    } catch (error) {
        showAuthMessage(error.message);
    }
}

window.login = async function() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email.includes('@gmail.com')) {
        showAuthMessage('Email harus mengandung @gmail.com');
        return;
    }
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        showAuthMessage(error.message);
    }
}

window.logout = async function() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Logout error:', error);
    }
}

window.loginWithGoogle = async function() {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        showAuthMessage('Gagal login dengan Google: ' + error.message);
    }
}

function showApp(user) {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('appPage').style.display = 'block';
    document.getElementById('userEmail').textContent = user.email;
    loadNotes(user.uid);
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        showApp(user);
    } else {
        document.getElementById('loginPage').style.display = 'block';
        document.getElementById('appPage').style.display = 'none';
        notes = [];
    }
});

function loadNotes(userId) {
    const notesRef = collection(db, "users", userId, "notes");
    const q = query(notesRef, orderBy("pinned", "desc"), orderBy("createdAt", "desc"));
    
    onSnapshot(q, (snapshot) => {
        notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderNotes();
    });
}

function renderNotes() {
    const list = document.getElementById('notesList');
    list.innerHTML = '';
    
    if (notes.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <img src="smartnotes.jpeg" alt="No notes">
                <h3>Belum ada catatan</h3>
                <p>Klik tombol "+ Catat" untuk mulai menulis</p>
            </div>
        `;
        return;
    }
    
    notes.forEach(note => {
        const card = document.createElement('div');
        card.className = 'note-card' + (note.pinned ? ' pinned' : '');
        card.innerHTML = `
            <div class="note-title">${note.title}</div>
            <div class="note-content">${note.content}</div>
            <div class="note-actions">
                <button class="pin-btn" onclick="togglePin('${note.id}')">${note.pinned ? '📌' : '📍'}</button>
                <button class="edit-btn" onclick="editNote('${note.id}')">✏️</button>
                <button class="delete-btn" onclick="deleteNote('${note.id}')">🗑️</button>
            </div>
        `;
        list.appendChild(card);
    });
}

window.openModal = function() {
    document.getElementById('modal').classList.add('active');
}

window.closeModal = function() {
    document.getElementById('modal').classList.remove('active');
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').value = '';
    editId = null;
}

window.saveNote = async function() {
    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').value.trim();
    const saveBtn = document.querySelector('.btn-save');

    if (!title) {
        alert('Judul catatan tidak boleh kosong!');
        return;
    }

    if (!auth.currentUser) {
        alert('Sesi anda telah berakhir, silakan login ulang');
        return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Menyimpan...';

    try {
        if (editId !== null) {
            await updateDoc(doc(db, "users", auth.currentUser.uid, "notes", editId), {
                title: title,
                content: content,
                updatedAt: new Date()
            });
            editId = null;
        } else {
            await addDoc(collection(db, "users", auth.currentUser.uid, "notes"), {
                title: title,
                content: content,
                pinned: false,
                createdAt: new Date()
            });
        }

        closeModal();
    } catch (error) {
        console.error('Error saving note:', error);
        alert('Gagal menyimpan catatan: ' + error.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Simpan';
    }
}

window.editNote = function(id) {
    const note = notes.find(n => n.id === id);
    document.getElementById('noteTitle').value = note.title;
    document.getElementById('noteContent').value = note.content;
    editId = id;
    openModal();
}

window.deleteNote = async function(id) {
    if (confirm('Hapus catatan ini?')) {
        try {
            await deleteDoc(doc(db, "users", auth.currentUser.uid, "notes", id));
        } catch (error) {
            console.error('Error deleting note:', error);
            alert('Gagal menghapus catatan');
        }
    }
}

window.togglePin = async function(id) {
    const note = notes.find(n => n.id === id);
    try {
        await updateDoc(doc(db, "users", auth.currentUser.uid, "notes", id), {
            pinned: !note.pinned
        });
    } catch (error) {
        console.error('Error toggling pin:', error);
    }
}

document.getElementById('addBtn').onclick = openModal;

// Speech-to-Text
const stt = new SpeechToText();

if (!stt.isSupported) {
  document.getElementById('speechBtn').style.display = 'none';
}

stt.onResult((text) => {
  document.getElementById('noteContent').value = text;
  document.getElementById('noteContent').dispatchEvent(new Event('input'));
});

stt.onStatusChange((status) => {
  const btn = document.getElementById('speechBtn');
  btn.classList.toggle('recording', status === 'recording');
});

stt.onError(() => {
  const btn = document.getElementById('speechBtn');
  btn.classList.remove('recording');
});

window.toggleSpeech = function() {
  stt.toggle();
}
