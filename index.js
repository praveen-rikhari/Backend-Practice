require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const Movie = require('./models/Movie');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(isLoggedIn);

app.set('view engine', 'ejs');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL)
    .then(() => {
        console.log("Database Connected :)");
    })
    .catch((err) => {
        console.log("Database not connected :(" + err);
    })

app.get('/', async (req, res) => {
    try {
        const movies = await Movie.find({}).populate('createdBy', 'username');
        res.render('index', { movies });
    } catch (error) {
        console.error("Error fetching movies:", error);
        res.send("Server error while fetching movies");
    }
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
                res.redirect("/profile");
                console.log("User registered sucessfully");
            });
        });
    } catch (error) {
        console.error(error);
        res.send(error);
        // return res.json({ message: error });
    }
})

app.get('/login', (req, res) => {
    res.render('login');
});

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
                res.redirect("/profile");
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
    res.redirect('/login');
})

// Protected Routes
app.get('/profile', isLoggedIn, async (req, res) => {
    if (!req.user) {
        return res.redirect('/login');
    }

    try {
        // fetching movies created by logged-in user
        const movies = await Movie.find({ createdBy: req.user.userId });
        const user = await User.findOne({ email: req.user.email });
        res.render('profile', { user, movies });
    } catch (error) {
        console.error(error);
        res.send('Error fetching profile data', error);
    }
})
app.get('/movies/create', isLoggedIn, (req, res) => {
    if (!req.user) {
        return res.redirect('/login');
    }
    res.render('createMovie');
});

app.post('/movies/create', isLoggedIn, async (req, res) => {
    const { title, description, imdbRating, genre } = req.body;
    try {
        const newMovie = await Movie.create({
            title,
            description,
            imdbRating,
            genre,
            createdBy: req.user.userId
        });
        console.log('Movie created successfully :)');
        res.redirect('/profile');
    } catch (error) {
        console.error(error);
        res.send('Error creating movie');
    }
})

// Middleware for checking if user is logged in or not;
function isLoggedIn(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        req.user = null;
        console.log("You must be logged in :/");
    } else {
        try {
            const data = jwt.verify(token, process.env.JWT_SECRET);
            req.user = data;
        } catch (error) {
            req.user = null;
        }
    }
    res.locals.user = req.user;  // Make user available in all EJS views
    next();
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
