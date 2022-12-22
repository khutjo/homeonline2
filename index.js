import * as dotenv from 'dotenv';
import * as path from 'path'
import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import {DatabaseConnection} from './database/dbconnection.js';
import {sendrequest} from './src/adafruitrequest.js';
import { fileURLToPath } from 'url';
import { default as jwt } from "jsonwebtoken";
dotenv.config();
const port = process.env.PORT || 3000
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


var app = express();
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.set('views', path.join(__dirname, './'));
app.use(express.static(path.join(__dirname, './')));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));

const Connect = new DatabaseConnection()
const SendRequest = new sendrequest()
// var string = encodeURIComponent('something that would break');
// res.redirect('/?valid=' + string);

const checkcoockie = (req, res, next)=>{
  var cookie = req.cookies.HomeOnlineuserjwt;
  req.allow = false;
  if(typeof cookie !== 'undefined'){
    jwt.verify(cookie, process.env.TOKEN_KEY, (err, authorizedData) => {
        if(err){
          console.log(err)
          next();
        }
        else{
          req.username = authorizedData.user_id
          req.allow = true
          next();
        }
    })
  }else
    next();

}



app.get('/', checkcoockie, function(req, res) {
  if (req.allow == true){
    res.redirect('/home')
  }
  else{
    res.redirect('/userlogin')
  }
});

app.get('/userlogin', function(req, res) {
  let senderror = {error: false};
  if (typeof req.query.error !== 'undefined')
    if (req.query.error.length == 4 && req.query.error == 'true')
      senderror = {error: true}
  res.render('pages/login', senderror);
})

app.post('/login', function(req, res) {
  let errormsg =  '';
  Connect.getlogin(req)
  .then(results => {
    // console.log(results)
    Connect.setJWTtoken(results.responsedata)
    .then(jwtresult => {
      res.cookie('HomeOnlineuserjwt', jwtresult.responsedata[1].RefreshToken, { maxAge: 90000000, httpOnly: true });
      res.redirect('/home')
    })
    .catch(error => {
      console.log('error setting jwt request ' + error)
      errormsg = encodeURIComponent('true');
      res.redirect('/userlogin?error=' + errormsg);
    });
  })
  .catch(error => {
    console.log('error rending log in request ' + error)
    errormsg = encodeURIComponent('true');
    res.redirect('/userlogin?error=' + errormsg);
  });
  
});

app.get('/home', checkcoockie, function(req, res) {


  if (req.allow == true){
    Connect.getactions(req)
    .then(results => {
      const token = jwt.sign(
        { user_id: req.username},
            process.env.TOKEN_KEY,
            {expiresIn: "1h"}
        );
      res.render('pages/home',{user: req.username,
      config: results.responsedata.actions,
      error: false,
      token: token})
    })
    .catch(error => {
      console.log(error)
      res.render('pages/home', {error: true, errormsg: 'unable to get config'});
    })
    
  }else{
    res.redirect('/userlogin')
  }

});

app.get('/sendaction', function(req, res) {
  const header = req.headers['authorization'];
  const action = req.headers['actions'];
  console.log(JSON.parse(action));

  if(typeof header !== 'undefined' && typeof action !== 'undefined'){
    jwt.verify(header, process.env.TOKEN_KEY, (err, authorizedData) => {
        if(err)
          res.send(JSON.stringify({ error: true, responsedata : null, errormsg: "invalid JWT sent" }))
        else{
          console.log(authorizedData.user_id)
          const actionid = JSON.parse(action).actionid
          Connect.verifyaction(authorizedData.user_id, actionid)
          .then(results => {
            const actions = results.responsedata.actions
            let valid = false;
            actions.forEach(data => {
              if (data.id == actionid)
                valid = true;
            })
            if (valid){
              Connect.getsendID(actionid, results.responsedata.partitionKey)
              .then(results => {
                SendRequest.send(results.send_id)
                .then(result => {
                  res.send(JSON.stringify({ error: false, responsedata : result, errormsg: "" }));
                }).catch(error => {
                  console.log(error)
                  res.send(JSON.stringify({ error: true, responsedata : null, errormsg: "unable to send request" }));
                })
              }).catch(error => {
                console.log(error)
                res.send(JSON.stringify({ error: true, responsedata : null, errormsg: "error sending send request" }));})
            }
          })
          .catch(error => {
            console.log(error)
            res.send(JSON.stringify({ error: true, responsedata : null, errormsg: "error verifing action" }))})
          // verifyaction
        }
    })
  }else 
    res.send(JSON.stringify({ error: true, responsedata : null, errormsg: "invalid data sent" }));

console.log(header)


  
})

app.post('/logout', checkcoockie, function(req, res) {
  // res.cookie('userjwt', jwtresult.responsedata[1].RefreshToken, { maxAge: 90000000, httpOnly: true });
  res.clearCookie('HomeOnlineuserjwt');
  res.redirect('/home')
})

app.listen(port, console.log("Server running on port: "+port))
