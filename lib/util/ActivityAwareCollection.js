const Collection = require("./Collection");

class ActivityAwareCollection extends Collection {
    constructor(baseObject, limit) {
        super();
        this.baseObject = baseObject;
        this.limit = limit;
    }

    add(obj, extra, replace) {
        obj.lastUpdated = Date.now();
        return super.add(obj, extra, replace);
    }

    update(obj, extra, replace) {
        obj.lastUpdated = Date.now();
        return super.update(obj, extra, replace);
    }
}

module.exports = ActivityAwareCollection;
