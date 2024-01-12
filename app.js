//jshint esversion:6
require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const app = express();
app.set("view engine","ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended:true}));

mongoose.connect("mongodb://127.0.0.1:27017/userDB");

const userSchema = new mongoose.Schema({
    email: String,
    password : String
});
// console.log(process.env.SECRET);
mongoose.plugin(encrypt ,{secret :process.env.SECRET, encryptedFields:["password"]});

const User = mongoose.model("User",userSchema);

app.get("/",function(req,res){
    res.render("home")
});

app.route("/login")
.get(function(req,res){
    res.render("login")
})
.post(async function(req,res){
    try{
        const username = req.body.username;
        const password = req.body.password;

        const foundUser = await User.findOne({email:username});
        if(foundUser)
        {
            if(password === foundUser.password)
            {
                res.render("secrets");
            }
        }
    }
    catch(err){
        console.log(err)
    }
});

app.route("/register")
.get(function(req,res){
    res.render("register")
})
.post(async function(req,res){
    try{
        const newUser = new User({
            email: req.body.username,
            password: req.body.password
        });

        newUser.save();
        res.render("secrets");
    }
    catch(err){
        console.log(err)
    }
});










app.listen(3000,function(){
    console.log("server running on port 3000")
});