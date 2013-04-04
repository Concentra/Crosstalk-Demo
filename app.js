jQuery.fn.reverse = [].reverse;

var api = new Crosstalk("http://10.10.0.90:9510/api/", null, CryptoJS, $.session);

var App = (function(){
    
    function App(viewSelector, api) {
        this.view = $(viewSelector);
        this.api = api;
    };
    
    App.prototype.setIntent = function(tpl) {
        if (typeof tpl == "string") {
            var obj = $("#templates " + tpl).clone();
        } else {
            obj = tpl;
        }
        this.view.children().remove().andSelf().append(obj);
        return this;
    };
    
    App.prototype.loadTemplate = function(tpl, data) {
        if (!(data instanceof Array)) {
            data = [data];
        }
        var results = [];
        var template = $("#templates > " + tpl);
        for (var idx in data) {
            var obj = template.html();
            var recurse = function(tpl, object, parent){
                for (var prop in object) {
                    if (Object.prototype.toString.call(object[prop]) == '[object Object]')
                    {
                        tpl = recurse(tpl, object[prop], parent + prop + ".");
                    } else {
                        tpl = tpl.replace("{{" + parent + prop + "}}", object[prop]);
                    }
                }
                return tpl;
            };
            obj = recurse(obj, data[idx], "");
            results.push(template.clone().html(obj));
        }
        return results;
    };
    
    App.prototype.getIntent = function() {
        return this.view;
    };
    
    App.prototype.intents = {
        messages: ".messages",
        login: ".login-form"
    };
    
    App.prototype.showFeed = function() {
        var self = this;
        var container = self.loadTemplate(".messages", {
            me: this.api.Me
        });
        self.setIntent(container);
        $('#content .messages form').submit(function(){
            self.api.Message.send($("[name=message]", this).val(), function(){
                $("#content .messages form [name=message]").val("");
            });
            return false;
        });
        this.api.Message.setFeedUpdateHandler(function(data) {
            var messages = "";
            var entryPoint = $('#content .messages .feed');
            $(self.loadTemplate(".message", data)).reverse().each(function(){
                var wobble = Math.random() * 5 - 2.5;
                $(this).css({
                    '-webkit-transform': 'rotate(' + wobble +'deg)',
                    '-webkit-transform-origin': '200px -100px'
                });
                entryPoint.prepend(this);
            });
        });
    };
    
    return App;
    
})();

var app = new App("#content", api);

$(document).ready(function(){

    $(document).on('submit', '.login-form form', function(e) {
        var email = $("[name=email]", this).val();
        var password = $("[name=password]", this).val();
        api.User.login(email, password, function(){
            app.showFeed();
        });
        return false;
    });
    
    // Show login form
    if (api.User.isLoggedIn()) {
        app.showFeed();
    } else {
        app.setIntent(app.intents.login);
    }

});