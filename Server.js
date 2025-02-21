require("dotenv").config()
const express = require("express")
const database = require("better-sqlite3")("dwoperations.db")
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
const createResponse = database.transaction(() => {

    database.prepare(
        `
    CREATE TABLE IF NOT EXISTS ticket_responses (
    
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type      STRING  ,
    mobile_no      STRING  ,
    client_name      STRING  ,
    account_no      STRING  ,
    branch      STRING  ,
    email      STRING  ,
    client_type      STRING  ,
    caller      STRING  ,
    product      STRING  ,
    criteria      STRING  ,
    query      STRING  ,
    sub_query      STRING  ,
    issue_is_resolved      STRING  ,
    has_watu_app      STRING  ,
    comment      STRING  ,
    voc      STRING  ,
    client_email      STRING  
)     
        `
    ).run()


})

createTable()
createResponse()

//End of db creaion
//Database Login

//End of database Logic
//End of Database

//End points
app.get("/logout", (req, res) => {
    console.log("Logging out")
    res.clearCookie('OurSimpleApp', { path: '/' })
    return res.json({
        message: "Logout success"
        , state: true
    })
})

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
        return res.json({ message: "Password too short. At least 8 charactors!" })

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
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return res.json({
        username: req.username,
        email: req.email,
        state: true
    })
})

//End of endPoints

app.post('/submit_ticket', (req, res) => {
    console.log("Submit post hit")
    try {
        const prepareInsert = database.prepare(
            `
            INSERT INTO ticket_responses (
             type ,
    mobile_no,
    client_name,
    account_no,
    branch,
    email,
    client_type,
    caller,
    product,
    criteria,
    query,
    sub_query,
    issue_is_resolved,
    has_watu_app,
    comment,
    voc,
    client_email
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            `
        )

        prepareInsert.run(
            req.body.type,
            req.body.mobile_no,
            req.body.client_name,
            req.body.account_no,
            req.body.branch,
            req.body.email,
            req.body.client_type,
            req.body.caller,
            req.body.product,
            req.body.criteria,
            req.body.query,
            req.body.sub_query,
            req.body.issue_is_resolved,
            req.body.has_watu_app,
            req.body.comment,
            req.body.voc,
            req.body.client_email,
        )

        res.json({
            state: true,
            message: "Success"
        })

    } catch (e) {
        console.log(e)
        res.json({
            state: false,
            message: e
        })
    }
})

//Listening port

app.listen(
    process.env.PORT, () => {
        console.log(`Listening on port ${process.env.PORT} \n... \n`)
    }
)