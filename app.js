const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const methodOverride = require("method-override");
const session = require("express-session");
const bcrypt = require("bcrypt");
const app = express();

const Product = require("./models/product");
const User = require("./models/user");
const Admin = require("./models/admin");
const Cart = require("./models/mycart");
const Order = require("./models/order");

const middleware = require("./middleware/index");
const { json } = require("express");

mongoose.connect("mongodb://localhost:27017/ecommercev15", {useNewUrlParser: true, useUnifiedTopology: true});

//express configuration
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));

//session configuration
app.use(session({
    secret: "Hello World!",
    resave: false,
    saveUninitialized: false
}));

//passing value into template
app.use(function(req, res, next){
    res.locals.currentUser = req.session.user;
    res.locals.currentAdmin = req.session.admin;
    res.locals.cartSession = req.session.cart;
    
    next();
});

//stripe keys
const publishableKey = "pk_test_51ISkEYIt0zrohrePWhCcQJnjdyDIAu6s5fhYKTjAItyj3OUe3ahtlTnq0ne9jdYW4p1OxglAvyHAwzC9EIsd0kcR00Y4pdalgy";
const secretKey = "sk_test_51ISkEYIt0zrohrePhpHW7sDleeihGioNEIKDEaHAS0Lu8DcDLFkTdYsIyODlADDbdw57TB0eZOR5PuomaWzHbNhu00mCn5nEJs";

const stripe = require('stripe')('sk_test_51ISkEYIt0zrohrePhpHW7sDleeihGioNEIKDEaHAS0Lu8DcDLFkTdYsIyODlADDbdw57TB0eZOR5PuomaWzHbNhu00mCn5nEJs');

//root route
app.get("/", function(req, res){
    res.render("landing");
})

//=============customer root page========
app.get("/customer", async function(req, res){
await console.log(req.session.user);
    Product.find({}, function(err, foundProduct){
    if(err){
        console.log(err);
    }else{

        res.render("home", {products: foundProduct});
    }
})    
}) 

// signup page customer
app.get("/customer/signup", function(req, res){
    res.render("signup")
})

//customer signup post route
app.post("/customer/signup", async function(req, res){
    console.log(req.body);
    const newUserObj = req.body;
    const user = await User.findOne({email: newUserObj.email});
    if(user){
        if(req.session.user){
            res.redirect("/customer");
        }else{
            res.redirect("/customer/signup")
        }
    }else{
        const newUser = new User(newUserObj);
        try{
            await newUser.save();
            req.session.user = newUser;
            res.redirect("/customer");
        }catch (e){
            console.log(e);
            res.redirect("/customer/signup");
        }
    }
} )

//customer login page
app.get("/customer/login", function(req, res){
    res.render("login");
});

//customer login post route
app.post("/customer/login", async function(req, res){
    try{
        if(req.session.user){
            res.redirect("/customer");
        }else{
            const user = await User.findOne({email: req.body.email});
            if(user){
                const isMatch = await bcrypt.compare(req.body.password, user.password);
                if(!isMatch){
                    console.log("Password Not matching");
                    res.redirect("/customer/login")
                }else{
                    req.session.user = user;
                    res.redirect("/customer")
                }
            }else{
                console.log("E-mail not found! Please signup");
                res.redirect("/customer/signup");
            }
            
        }
    }catch (e){
        console.log(e);
        res.redirect("/customer/login")
    }
})

//customer product details
app.get("/customer/product/:id", function(req, res){
    Product.findById(req.params.id, function(err, product){
        if(err){
            res.redirect("back")
        }else{
            res.render("show", {product: product})
        }
    })
})

//add to cart route
app.get("/customer/:customer_id/product/:product_id/cart", async function(req, res){
    var productId = req.params.product_id;
    var cart = new Cart(req.session.cart ? req.session.cart : {});
    console.log(cart);
    const product = await Product.findById(productId);
    console.log(product);
        if(product){
            cart.add(product, product._id);
            req.session.cart = cart;
            console.log(req.session.cart);
            return res.redirect("/customer");    
        }
        res.redirect("/")
})

//get cart products
app.get("/customer/:customer_id/product/mycart", function(req, res){
    if(req.session.cart && req.session.cart.totalPrice > 0){
        var cart = new Cart(req.session.cart);
        return res.render("cart", {products: cart.generateArray(), totalPrice: cart.totalPrice});
    }
    res.render("cart", {products: null});
});

//increase product item
app.get("/add/:id", async function(req, res){
    var productId = req.params.id;
    const product = await Product.findById(productId);
    var cart = new Cart(req.session.cart ? req.session.cart : {} );
    cart.add(product, product._id);
    req.session.cart = cart;
    res.redirect("back");
})

//reduce cart items
app.get("/reduce/:id", function(req, res){
    var productId = req.params.id;
    var cart = new Cart(req.session.cart ? req.session.cart : {});
    cart.reduceByOne(productId);
    req.session.cart = cart;
    res.redirect("/customer/:customer_id/product/mycart");
});

//remove total cart items
app.get("/remove/:id", function(req, res){
    var productId = req.params.id;
    var cart = new Cart(req.session.cart ? req.session.cart : {});
    cart.removeItem(productId);
    req.session.cart = cart;
    console.log(req.session.cart);
    res.redirect("/customer/:customer_id/product/mycart");
});

//Stripe Payment Integration

//using stripe checkout version 2
app.post("/charge", function(req, res){
    console.log(req.body);
    const cart = new Cart(req.session.cart ? req.session.cart : {});
    stripe.customers.create({
        email: req.body.stripeEmail,
        source: req.body.stripeToken,
        name: req.session.user.firstName
    })
    .then((customer) => {
        return stripe.charges.create({
            amount: cart.totalPrice * 100,
            currency: "INR",
            customer: customer.id 
        });
    })
    .then((charge) => {
        //after charge payment cart product should be save into specific customer orders array
        const cart = new Cart(req.session.cart ? req.session.cart : {});
        let product = cart.generateArray();
        console.log(product);
        User.findById(req.session.user._id, function(err, user){
            if(err){
                console.log(err);
            }else{
                console.log("charge id " + charge.id);
                const order = new Order({
                    user: req.session.user,
                    cart: cart,
                    name: req.session.user.firstName,
                    paymentId: charge.id
                });
                order.save(function(err, result){
                        req.session.cart = null;
                        res.redirect("/customer");
                })
                            }
        });
        
    })
    .catch((err) =>{
        console.log(err);
    })
})

//my orders route
app.get("/customer/myorder", function(req, res){
    Order.find({user: req.session.user}, function(err, orders){
        if(!err){
            var cart;
            orders.forEach(function(order){
                cart = new Cart(order.cart);
                order.items = cart.generateArray();
                console.log(order.items);
            })
            res.render("myorder", {orders: orders });
        }                
    })
})

//search product from db
app.post("/search", function(req, res){
    console.log(req.body);
    Product.find({name: req.body.product}, function(err, product){
        if(!err){
            console.log(product);
        }
    })
})

//=====================Admin Route=============
//admin home
app.get("/seller", function(req, res){
    console.log(req.session.admin);
    Product.find({}, function(err, foundproduct){
        if(err){
            console.log(err);
        }else{
            res.render("adminhome", {products: foundproduct});
        }
    })
})

//admin signup page
app.get("/seller/signup", function(req, res){
    res.render("adminsignup");
})

//admin post signup route
app.post("/seller/signup", async function(req, res){
    const newAdminObj = req.body;
    const admin = await Admin.findOne({email: newAdminObj.email});
    if(admin){
        if(req.session.admin){
            res.redirect("/seller");
        }else{
            res.redirect("/seller/signup")
        }
    }else{
        const newAdmin = new Admin(newAdminObj);
        try{
           await newAdmin.save();
           req.session.admin = newAdmin;
           res.redirect("/seller");
        }catch (e){
            console.log(e);
            res.redirect("/seller/signup");
        }
    }

})

//admin login page
app.get("/seller/login", function(req, res){
    res.render("adminlogin")
});

//admin login post route
app.post("/seller/login", async function(req, res){
    try{
        if(req.session.admin){
            res.redirect("/seller");
        }else{
        const admin = await Admin.findOne({email: req.body.email});
        if(admin){
            const isMatch = await bcrypt.compare(req.body.password, admin.password);
            if(!isMatch){
                res.send("Password not matching");
                res.redirect("/seller/login")
            }else{
                req.session.admin = admin;
                res.redirect("/seller");
            }
        }else{
            res.redirect("/seller/signup");
        }
        }
    }catch (e){
        console.log(e);
        res.redirect("/seller/signup")
    }
})

//==================add product route===========
//add product route
app.get("/seller/:id/addproduct", middleware.isAdminLoggedin, function(req, res){
    res.render("adminaddproduct");
})

//post product route
app.post("/seller/:id/addproduct", async function(req, res){
    const admin = await Admin.findById(req.params.id);
    if(admin){
        const newProduct = {
            name: req.body.name,
            image: req.body.image,
            price: req.body.price,
            description: req.body.description,
            seller: {
                id: req.session.admin._id,
                username: req.session.admin.name
            }
        };
        const product = await Product.create(newProduct);
        if(product){
            console.log(product);
            admin.posts.push(product);
            await admin.save();
            res.redirect("/seller");
        }else{
            res.redirect("back");
        }
    }else{
        res.redirect("/seller/signup");
    }
})

//show product details
app.get("/seller/product/:id", middleware.isAdminLoggedin, (req, res) =>{
    Product.findById(req.params.id, function(err, foundProduct){
        if(err){
            console.log(err);
        }else{
            res.render("adminshow", {product: foundProduct}); 
        }
    })
   
})

//edit product details
app.get("/seller/product/:id/edit", function(req, res){
    Product.findById(req.params.id, function(err, foundProduct){
        if(err){
            console.log(err);
        }else{
            res.render("admineditproduct", {product: foundProduct});
        }
    })
    
})

//update product details
app.put("/seller/product/:id/edit", function(req, res){
    var updatedProduct = {
        name: req.body.name,
        image: req.body.image,
        price: req.body.price,
        description: req.body.description
    };
    Product.findByIdAndUpdate(req.params.id, updatedProduct, function(err, updatedProduct){
        if(err){
            console.log(err);
        }else{
            res.redirect("/seller")
        }
    })
})

//display their product for current admin
app.get("/seller/:id/products", function(req, res){
    Admin.findById(req.params.id).populate("posts").exec(function(err, foundData){
        if(err){
            res.redirect("/seller/signup")
        }else{
            console.log(foundData);
            res.render("adminproducts", {products: foundData});
        }
    })
    
    
})

//delete a product post
app.delete("/seller/product/:id/delete", (req, res) =>{
    Product.findByIdAndRemove(req.params.id, function(err){
        if(err){
            console.log(err);
        }else{
            res.redirect("/seller")
        }
    })
})

//logout user and admin
app.get("/logout", function(req, res){
    if(req.session.user){
        req.session.user = null;
        res.redirect("/");
    }else if(req.session.admin){
        req.session.admin = null;
        res.redirect("/");
    }else{
        res.redirect("/")
    }
})

//port setup
let port = 3000 || process.env.PORT;
app.listen(port, function(){
    console.log("Server is Running");
})