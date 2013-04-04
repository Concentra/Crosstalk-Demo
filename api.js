var Crosstalk = (function(){

    var User = new (function() {
            
        function User(api) {
            this.api = api;
            this.base = api.base;
            this.__base = api.__base;
        };
    
        User.prototype.get = function(id, callback) {
            return this.api.get("identity", id, callback);
        };
    
        User.prototype.find = function(params, callback) {
            $.ajax(this.api.getBase() + "identity", {
                data: params,
                contentType: "application/json",
                dataType: "json",
                success: function(data) {
                    callback(data);
                },
                error: function(e, status) {
                    alert(status);
                }
            });
            return this;
        };
    
        // Refactor into Auth ctx
        User.prototype.isLoggedIn = function() {
            return this.api.getUserId() != null;
        };
    
        User.prototype.login = function(username, password, callback) {
            var self = this;
            var user = this.find({"username" : username}, function(users){
                if (Object.prototype.toString.call(users) !== '[object Array]') {
                    self.register.call(self, username, password, callback);
                } else {
                    var user = users[0];
                    if (self.api.cryptoJS.SHA1(password).toString() == user.Data.password) {
                        // Use Auth ctx
                        self.api.userId = users[0].Id;
                        this.api.session.set('uid', self.api.userId);
                        alert("Logged in!");
                        callback();
                    } else {
                        alert("Invalid password!");
                    }
                }
            });
        };
        
        // Put in Auth ctx
        User.prototype.logout = function() {
            this.api.session.delete('uid');
        };
    
        User.prototype.register = function(username, password, callback) {
            $.post(this.base + "identity", {
                Name: username,
                AvatarUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAWklEQVQYV2NkIBIwIqnbjEOPL0gcphCkCCyABYDl0BXOBAqmQxXD2CgK/0NNh9EgtShiMBORFaDbDpZDVigFFHiGpgomhqEQm2dAmuEKYW7CphBsK3I44g16AJnaEwtu0oQiAAAAAElFTkSuQmCC",
                Type: "person",
                Data: {
                    "username": username,
                    "password": this.api.cryptoJS.SHA1(password).toString()
                }
            }, function(data) {
                alert("Registered!");
                callback();
            });
        };
    
        return User;
    })();
    
    var Message = (function() {
        
        function Message(api) {
            this.api = api;
            this.currentMessages = [];
        };
        
        Message.prototype.get = function(id, callback) {
            return this.api.get("messages/get", id, callback);
        };
        
        Message.prototype.feed = function(callback) {
            return this.api.get("feed", {
                id: this.api.getUserId(),
                exclusions: "[]"
            }, callback);
        };
        
        Message.prototype.setFeedUpdateHandler = function(handler) {
            var self = this;
            var it = function(){
                self.feed(function(messages) {
                    var results = [];
                    for (var idx in messages) {
                        if (self.currentMessages.indexOf(messages[idx].Id) == -1) {
                            results.push(messages[idx]);
                            self.currentMessages.push(messages[idx].Id);
                        }
                    }
                    handler(results);
                    setTimeout(it, 1000);
                });
            };
            it();
            return this;
        };
        
        Message.prototype.send = function(message, callback) {
            var self = this;
            self.api.Edge.getToPublic(self.api.getUserId(), function(edge) {
                $.ajax(self.api.getBase() + "messages", {
                    type: "POST",
                    data: {
                        Body: message,
                        Edge: {
                            Id: edge.Id
                        }
                    },
                    success: function(data) {
                        callback(data);
                    },
                    error: function() {
                        alert("Couldn't save message");
                    }
                });
            });
            return this;
        }
        
        return Message;
    })();
    
    var Edge = (function() {
        
        function Edge(api) {
            this.api = api;
        };
        
        Edge.prototype.getToPublic = function(src, callback) {
            var complete = false;
            var edgeId = null;
            var promise = $.ajax(this.api.getBase() + "edge/find", {
                data: {
                    from: src,
                    to: "public",
                    type: "broadcast"
                },
                contentType: "application/json",
                dataType: "json",
                success: function(edge){
                    callback(edge);
                },
                error: function() {
                    alert("Could not resolve edge");
                }
            });
            return this;
        };
        
        return Edge;
        
    })();
    
    function API(base, userId, cryptoJS, session) {
        this.base = base;
        this.cryptoJS = cryptoJS;
        this.session = session;
        this.userId = this.session.get('uid') || userId;
        
        this.User = new User(this);
        this.Edge = new Edge(this);
        this.Message = new Message(this);
        if (this.userId == undefined) {
            this.Me = {};
        } else {
            var self = this;
            this.User.get(this.userId, function(user) {
                self.Me = user;
            });
        }
    };
    
    API.prototype.getBase = function() {
        return this.base;
    };
    
    API.prototype.getUserId = function() {
        return this.userId;
    };
    
    API.prototype.getCrypto = function() {
        return this.cryptoJS;
    };
    
    API.prototype.get = function(endpoint, idOrData, callback, async) {
        var qs = "";
        var data = undefined;
        async = async || true;
        if (typeof idOrData == "string") {
            qs = "/" + idOrData;
        } else {
            data = idOrData;
        }
        $.ajax(this.base + endpoint + qs, {
            contentType: "application/json",
            dataType: "json",
            data: data,
            async: async,
            success: function(data) {
                callback(data);
            },
            error: function(e, status) {
                alert(status);
            }
        });
        return this;
    }
    
    API.prototype.Edge = {
        get: function(id, callback) {
            return this.get("edge", id, callback);
        }
    };
    
    return API;
    
})();