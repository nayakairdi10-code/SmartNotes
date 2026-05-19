export class SpeechToText {
  constructor(options = {}) {
    this.lang = options.lang || 'id-ID';
    this.continuous = options.continuous !== false;
    this.interimResults = options.interimResults !== false;
    this._recognition = null;
    this._isRecording = false;
    this._callbacks = {
      result: [],
      error: [],
      statusChange: [],
    };

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    this._supported = !!SR;
    if (this._supported) {
      this._recognition = new SR();
      this._recognition.lang = this.lang;
      this._recognition.continuous = this.continuous;
      this._recognition.interimResults = this.interimResults;

      this._recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        this._emit('result', transcript);
      };

      this._recognition.onerror = (event) => {
        this._emit('error', event.error);
        this._setRecording(false);
      };

      this._recognition.onend = () => {
        this._setRecording(false);
      };
    }
  }

  get isSupported() {
    return this._supported;
  }

  get isRecording() {
    return this._isRecording;
  }

  onResult(callback) {
    this._callbacks.result.push(callback);
    return this;
  }

  onError(callback) {
    this._callbacks.error.push(callback);
    return this;
  }

  onStatusChange(callback) {
    this._callbacks.statusChange.push(callback);
    return this;
  }

  start() {
    if (!this._supported || this._isRecording || !this._recognition) return;
    try {
      this._recognition.start();
      this._setRecording(true);
    } catch (e) {
      this._emit('error', e.message);
    }
  }

  stop() {
    if (!this._supported || !this._isRecording || !this._recognition) return;
    try {
      this._recognition.stop();
      this._setRecording(false);
    } catch (e) {
      this._emit('error', e.message);
    }
  }

  toggle() {
    this._isRecording ? this.stop() : this.start();
  }

  destroy() {
    if (this._recognition) {
      try { this._recognition.stop(); } catch (_) {}
    }
    this._callbacks.result = [];
    this._callbacks.error = [];
    this._callbacks.statusChange = [];
    this._recognition = null;
    this._isRecording = false;
  }

  _setRecording(value) {
    if (this._isRecording === value) return;
    this._isRecording = value;
    this._emit('statusChange', value ? 'recording' : 'stopped');
  }

  _emit(event, data) {
    (this._callbacks[event] || []).forEach(cb => cb(data));
  }
}
