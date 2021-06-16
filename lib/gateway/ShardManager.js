"use strict";

const Base = require("../structures/Base");
const Collection = require("../util/Collection");
const Shard = require("./Shard");

class ShardManager extends Collection {
    constructor(client) {
        super(Shard);
        this._client = client;
        this.maxConcurrency = 1;
        this.connectQueue = [];
        this.lastConnect = 0;
        this.connectTimeout = null;
    }

    connect(shard) {
        if((shard.sessionID || (this.lastConnect <= Date.now() - 5000 && !this.find((shard) => shard.connecting))) && !this._client.options.useMaxConcurrency) {
            shard.connect();
            this.lastConnect = Date.now() + 7500;
        } else {
            this.connectQueue.push(shard);
            this.tryConnect();
        }
    }

    spawn(id) {
        let shard = this.get(id);
        if(!shard) {
            shard = this.add(new Shard(id, this._client));
            shard.on("ready", () => {
                /**
                * Fired when a shard turns ready
                * @event Client#shardReady
                * @prop {Number} id The ID of the shard
                */
                this._client.emit("shardReady", shard.id);
                if(this._client.ready) {
                    return;
                }
                for(const other of this.values()) {
                    if(!other.ready) {
                        return;
                    }
                }
                this._client.ready = true;
                this._client.startTime = Date.now();
                /**
                * Fired when all shards turn ready
                * @event Client#ready
                */
                this._client.emit("ready");
            }).on("resume", () => {
                /**
                * Fired when a shard resumes
                * @event Client#shardResume
                * @prop {Number} id The ID of the shard
                */
                this._client.emit("shardResume", shard.id);
                if(this._client.ready) {
                    return;
                }
                for(const other of this.values()) {
                    if(!other.ready) {
                        return;
                    }
                }
                this._client.ready = true;
                this._client.startTime = Date.now();
                this._client.emit("ready");
            }).on("disconnect", (error) => {
                /**
                * Fired when a shard disconnects
                * @event Client#shardDisconnect
                * @prop {Error?} error The error, if any
                * @prop {Number} id The ID of the shard
                */
                this._client.emit("shardDisconnect", error, shard.id);
                for(const other of this.values()) {
                    if(other.ready) {
                        return;
                    }
                }
                this._client.ready = false;
                this._client.startTime = 0;
                /**
                * Fired when all shards disconnect
                * @event Client#disconnect
                */
                this._client.emit("disconnect");
            });
        }
        if(shard.status === "disconnected") {
            this.connect(shard);
        }
    }

    // https://github.com/curtisf/eris/commit/6b8397da17c2fabf37f5c08f40899c5131d599fb#diff-df83f51ebdee7648e64537556e67de936a1f8a78c2e4459b49a5b850a35cdfa2
    tryConnect() {
        if(this.connectQueue.length > 0) {
            if(!this._client.options.useMaxConcurrency) {
                if(this.lastConnect <= Date.now() - 5000) {
                    const shard = this.connectQueue.shift();
                    shard.connect();
                    this.lastConnect = Date.now() + 7500;
                } else if(!this.connectTimeout) {
                    this.connectTimeout = setTimeout(() => {
                        this.connectTimeout = null;
                        this.tryConnect();
                    }, 1000);
                }
            } else {
                if(this.filter((shard) => shard.connecting).length < this.maxConcurrency) {
                    const shard = this.connectQueue.shift();
                    shard.connect();
                    //this.lastConnect = Date.now() + 7500;
                } else if(!this.connectTimeout) {
                    this.connectTimeout = setTimeout(() => {
                        this.connectTimeout = null;
                        this.tryConnect();
                    }, 250);
                }
            }
        }
    }

    _readyPacketCB() {
        this.lastConnect = Date.now();
        this.tryConnect();
    }

    toString() {
        return `[ShardManager ${this.size}]`;
    }

    toJSON(props = []) {
        return Base.prototype.toJSON.call(this, [
            "connectQueue",
            "lastConnect",
            "connectionTimeout",
            ...props
        ]);
    }
}

module.exports = ShardManager;
