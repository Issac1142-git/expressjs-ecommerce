const User = require("../models/user");
const Admin = require("../models/admin");

var middlewareObj = {};

//check login if user session created or not
middlewareObj.isUserLoggedin = function (req, res, next) {
    if (req.session.user) {
        return next();
    }
    res.redirect("/customer/login");
}

//check login if admin session created or not
middlewareObj.isAdminLoggedin = function (req, res, next) {
    if (req.session.admin) {
        return next();
    }
    res.redirect("/seller/login");
}

module.exports = middlewareObj;