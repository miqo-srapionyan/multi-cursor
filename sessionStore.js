/* abstract */
class SessionStore {
    findSession(id) {
    }

    saveSession(id, session) {
    }

    findAllSessions() {
    }
}

class InMemorySessionStore extends SessionStore {
    constructor() {
        super();
        this.sessions = new Map();
    }

    findSession(id) {
        return this.sessions.get(id);
    }

    removeSession(id) {
        this.sessions.delete(id);
    }

    saveSession(id, session) {
        this.sessions.set(id, session);
    }

    findAllSessions() {
        return [...this.sessions.values()];
    }
}

module.exports = {
    InMemorySessionStore
};