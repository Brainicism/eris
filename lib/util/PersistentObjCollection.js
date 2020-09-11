const Collection = require("./Collection");

class PersistentObjCollection extends Collection {
    constructor(baseObject, limit, persistentIds) {
        super();
        this.baseObject = baseObject;
        this.limit = limit;
        this.persistentIds = new Set(persistentIds);
        console.log(`Setting persistent users: ${Array.from(this.persistentIds)}`);
    }

    add(obj, extra, replace) {        
        //make room for persistent users
        if (this.limit && this.size > this.limit - this.persistentIds.size) {
            const iter = this.keys();
            while (this.size > this.limit - this.persistentIds.size) {
                const nextValue = iter.next().value;
                if (!this.persistentIds.has(nextValue)) {
                    this.delete(nextValue);
                }
            }
        }
        return super.add(obj, extra, replace);
    }

    setPersistentIds(persistentIds) {
        this.persistentIds = new Set(persistentIds);
    }
}

module.exports = PersistentObjCollection;
