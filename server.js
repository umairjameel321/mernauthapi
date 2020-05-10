const express = require('express');
const morgan = require('morgan'); 
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

require('dotenv').config(); // to use env variables

const app = express();

// connect to db
mongoose.connect(process.env.DATABASE, {
    useNewUrlParser: true,
    useFindAndModify: true,
    useUnifiedTopology: true,
    useCreateIndex: true
}).then(() => console.log("DB Connected"))
.catch(err => console.log("DB Connection error: ", err));

// import routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");

// app middlewares
app.use(morgan('dev')); // this shows in the terminal that which route got hit and what is the status code of it
app.use(bodyParser.json());
// app.use(cors()); // allows all origins to make requests to our server
if(process.env.NODE_ENV = 'development') {
    app.use(cors({origin: `http://localhost:3000`})) // only allow localhost:3000 to access to our server (in development mode)
}

// middlewares
app.use('/api', authRoutes);
app.use('/api', userRoutes);

const port = process.env.PORT;
app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
})