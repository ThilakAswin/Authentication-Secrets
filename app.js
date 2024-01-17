//jshint esversion:6
require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();
app.set("view engine","ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
    secret: "My Secret",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/userDB");


const userSchema = new mongoose.Schema({
    email: String,
    password : String,
    googleId: String,
    facebookId:String,
    secret: String
});
// console.log(process.env.SECRET);
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User",userSchema);
// use static authenticate method of model in LocalStrategy
passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });
  
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
    // userProfileURL: "https://www.googleapis.com/oauth3/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
  clientID: process.env.FB_CLIENT_ID,
  clientSecret: process.env.FB_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/facebook/secrets"
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ facebookId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

app.get("/",function(req,res){
    res.render("home")
});

app.get("/secrets",async function(req,res){
  try{
    const foundUser = await User.find({"secret":{$ne:null}});
    if(foundUser){
      res.render("secrets",{userWithSecrets:foundUser});
    }
  }
    catch(err){
      console.log(err);
    }
  });

app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
    res.render("submit")
    }
    else{
        res.render("login")
    }
});

app.post("/submit",async function(req,res){
  try{
  const submitedSecret = req.body.secret;
  const foundSecret = await User.findById(req.user.id);
  if(foundSecret){
    foundSecret.secret = submitedSecret;
    foundSecret.save();
    res.redirect("/secrets");
  }
  }
  catch(err){
    console.log(err);
  }
})

app.get('/auth/google',
  passport.authenticate('google', { scope: ['email','profile'] }));

  app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/secrets');
  });

  app.get('/auth/facebook',
  passport.authenticate('facebook'));
 
app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

  

app.get("/logout",function(req,res){
    req.logout(function(err){
        if(err){
            console.log(err)}
    });
    res.redirect("/");
})

app.route("/login")
.get(function(req,res){
    res.render("login")
})
.post(function(req,res){
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user,function(err){
        if(err){
            console.log(err)
        }
        else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets")
            })
        }
    })
})

app.route("/register")
.get(function(req,res){
    res.render("register")
})

.post(function(req,res){
     User.register({username:req.body.username},req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }
        else{
            passport.authenticate("local")(req,res,function(){
                    res.redirect("/secrets");
            })
        }
     })
})






app.listen(3000,function(){
    console.log("server running on port 3000")
});