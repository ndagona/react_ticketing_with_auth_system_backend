require("dotenv").config()
const express = require("express")
const database = require("better-sqlite3")("Dave.db")
database.pragma("journal_mode = WAL")
const cors = require("cors")
const jwt = require("jsonwebtoken")
const cookieParser = require("cookie-parser");
//App declaration

const app = express()

//Use
app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(cookieParser());
app.use(cors(

    {
        origin: "http://localhost:3000", // Adjust this
        credentials: true // This is crucial for cookies to be sent
    }
));
app.use(express.json());

//Middle ware
app.use(function (req, res, next) {
    next()
})

//End of use

//Middle ware // Required by use

app.use(function (req, res, next) {
    next()
})

//End of middle ware


//Database

//Database creation if not exist
const createTable = database.transaction(() => {

    database.prepare(
        `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email STRING NOT NULL UNIQUE,
            username STRING NOT NULL UNIQUE,
            password STRING NOT NULL
        )
        `
    ).run()
})

createTable()

//End of db creaion
//Database Login

//End of database Logic
//End of Database

//End points
app.post("/", (req, res) => {
    res.send({
        message: "server running smoothly.."
    })
})
app.get("/", (req, res) => {
    res.send({
        message: "server running smoothly.."
    })
})

app.post('/register', (req, res) => {
    console.log("Register post request")
    console.log(req.body)


    if (typeof req.body.username !== "string" || req.body.username.length < 3 || req.body.username.length > 20) {
        return res.json({ message: "Invalid Username" })

    }
    if (typeof req.body.password !== "string" || req.body.password.length < 8) {
        res.json({ message: "Password too short. At least 8 charactors!" })
        return
    }

    const writeToDatabase = () => {
        try {
            const newEntry = database.prepare("INSERT INTO users (email, username, password) VALUES (?,?,?)")
            const db_return = newEntry.run(
                req.body.email,
                req.body.username,
                req.body.password
            )

            const lookup_id = database.prepare(
                `SELECT * FROM users
                 WHERE 1 = 1
                 AND ROWID = ?
                `
            )
            const ourUser = lookup_id.get(db_return.lastInsertRowid)

            return [true, ourUser]
        }
        catch (db_error) {
            const db_error_str = db_error.toString()
            console.log(`DB error is : ${db_error_str}`)
            if (db_error_str.includes('UNIQUE')) {
                if (db_error_str.includes('email')) {
                    return "Email Already Registered"
                }
                if (db_error_str.includes('username')) {
                    return "Username NOT available, pick another"
                }
                return "Ooops! Something went wrong"
            }

        }

    }
    const writeRes = writeToDatabase()
    if (writeRes[0] === true) {
        console.log(`\n\n${writeRes[1].id}\n\n`)
        const tokenVal = jwt.sign({
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, //24hour expiry
            color: "The Blues",
            country: "Kenya",
            artist: "JCOLE, JAYZ, DRAKE",
            userid: writeRes[1].id,
            email: writeRes[1].email,
            username: writeRes[1].username
        }
            , process.env.JWTTOKENKEY
        )
        res.cookie("OurSimpleApp", tokenVal, {
            httpOnly: true,
            //secure: true,
            sameSite: "strict",
            maxAge: 1000 * 60 * 60 * 24 //Cookie be good, one day
        })
        res.json({ message: "Signup successful", state: true });
    } else {
        res.json({ message: writeRes.toString() });
    }


})

app.post('/login', (req, res) => {
    if (typeof req.body.username !== "string" || req.body.username.length < 3 || req.body.username.length > 20) {
        return res.json({ message: "Invalid Username" })

    }
    if (typeof req.body.password !== "string" || req.body.password.length < 8) {
        res.json({ message: "Password too short. At least 8 charactors!" })
        return
    }

    const checkUser = () => {
        const readStatement = database.prepare("SELECT * FROM users WHERE username = ? AND password = ?")
        const readResult = readStatement.get(req.body.username, req.body.password)
        return readResult
    }

    const tempData = checkUser()
    const res_dict = tempData !== 'undefined' ? {
        useremail: tempData.email, username: tempData.username, state: true
    } : { message: "Wrong Login Credentials. Create Account", state: false }

    const tokenVal = jwt.sign({
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, //24hour expiry
        color: "The Blues",
        country: "Kenya",
        artist: "JCOLE, JAYZ, DRAKE",
        userid: tempData.id,
        email: tempData.email,
        username: tempData.username
    }
        , process.env.JWTTOKENKEY
    )
    res.cookie("OurSimpleApp", tokenVal, {
        httpOnly: true,
        //secure: true,
        sameSite: "strict",
        maxAge: 1000 * 60 * 60 * 24 //Cookie be good, one day
    })
    return res.send(res_dict)
})


//Logged in API
const verify_user = (req, res, next) => {
    const OurSimpleApp = req.cookies.OurSimpleApp;
    if (!OurSimpleApp) {
        console.log("In ender statement")
        return res.send({
            message: "Not logged in",
            state: false
        })
    }

    else {
        console.log("In cookie else")
        jwt.verify(
            OurSimpleApp, process.env.JWTTOKENKEY, (err, deku) => {
                if (err) {
                    return res.send({
                        message: "Not logged in",
                        username: "",
                        email: "",
                        state: false
                    })
                } else {
                    req.username = deku.username;
                    req.email = deku.email;
                    next()
                }
            }
        )
    }
}

app.get("/loggedin", verify_user, (req, res) => {
    return res.json({
        username: req.username,
        email: req.email,
        state: true
    })
})

//End of endPoints


//Listening port

app.listen(
    process.env.PORT, () => {
        console.log(`Listening on port ${process.env.PORT}`)
    }
)