require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const PORT = process.env.PORT || 3000;

const app = express();
        
app.use(cors());

app.use(express.limit('5M'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, 'public', 'build')));

app.use("/api/user",require("./routes/users.js"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api",require("./routes/index.js"));

app.get('*', function (req, res) {
    res.sendFile(path.join(__dirname, 'public', 'build', 'index.html'));
});

mongoose.connect(process.env.MONGO_URI,{
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: true,
    useCreateIndex: true,
    useFindAndModify: false
})
    .then(async () => {
        console.log("mongodb started...");
        
        app.listen(PORT,() => {
            console.log(`Server started on port ${PORT}`);
        })
    })
    .catch(console.log)
