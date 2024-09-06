require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL)
    .then(() => {
        console.log("Database Connected :)");
    })
    .catch((err) => {
        console.log("Database not connected :(" + err);
    })

app.get('/', (req, res) => {
    res.send('Welcome to the Movie Recommendation Platform');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
