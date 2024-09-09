require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.set('view engine', 'ejs');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL)
    .then(() => {
        console.log("Database Connected :)");
    })
    .catch((err) => {
        console.log("Database not connected :(" + err);
    })

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/register', (req, res) => {
    res.render('register');
});

// logic for registering a user
app.post('/register', async (req, res) => {
    const { username, password, email } = req.body;

    try {
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            console.log("User already registered with this email");
            return res.send("Already registered user");
            // return res.json({ message: "Already registered user" });
        }

        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(password, salt, async (err, hash) => {
                const newUser = await User.create({
                    username,
                    email,
                    password: hash,
                });

                let token = jwt.sign({ email, userId: newUser._id }, process.env.JWT_SECRET);
                res.cookie("token", token);
                res.send("User registered sucessfully");
            });
        });

        console.log("User registered successfully");
        // return res.json({ message: "User Registered successfully" });
    } catch (error) {
        console.error(error);
        res.send(error);
        // return res.json({ message: error });
    }
})

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/profile', isLoggedIn, (req, res) => {
    res.send("This is the profile route and it is protected");
})

// logic for logging in a user
app.post('/login', async (req, res) => {
    const { password, email } = req.body;

    try {
        const existingUser = await User.findOne({ email });

        if (!existingUser) {
            console.log("Something went wrong");
            return res.send("Something went wrong");
            // return res.json({ message: "Already registered user" });
        }

        bcrypt.compare(password, existingUser.password, (err, result) => {
            if (result) {
                let token = jwt.sign({ email, userId: existingUser._id }, process.env.JWT_SECRET);
                res.cookie("token", token);
                res.send("Sucessfully logged In :)");
                console.log("Sucessfully logged In :)")
            } else {
                console.log("Error while logging In :)")
                res.redirect('/login');
            }
        })

    } catch (error) {
        console.error(error);
        res.send(error);
        // return res.json({ message: error });
    }
})

// logic for logging out a user
app.get('/logout', (req, res) => {
    res.cookie("token", "");
    console.log("User Logged out sucesssfully :)");
    res.redirect('login');
})

// Middleware for checking if user is logged in or not;
function isLoggedIn(req, res, next) {
    if (req.cookies.token === "") {
        res.send("You must be logged in :/");
    } else {
        let data = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
        req.user = data;
        next();
    }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
