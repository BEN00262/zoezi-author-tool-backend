require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const PORT = process.env.PORT || 3500;

const app = express();
        
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/user",require("./routes/users.js"));
app.use("/admin", require("./routes/admin"));
app.use("/",require("./routes/index.js"));

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
