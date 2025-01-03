const express=require('express');
const app=express();
const path = require('path');
const server=require('http').createServer(app);
const io=require("socket.io")(server);
const indexRouter = require('./routes/index.js');

app.set("view engine","ejs");
app.use(express.json());
app.use(express.urlencoded({ extended:true }));
app.use(express.static(path.join(__dirname,"public")));

let waitingusers = [ ];
let rooms ={};

io.on("connection",socket=>{
  socket.on("joinroom",function(){
    if(waitingusers.length>0){
      let partner=waitingusers.shift();
      const roomname = `${socket.id}-${partner}`;
      socket.join(roomname);
      io.sockets.sockets.get(partner).join(roomname);
      io.to(roomname).emit("joined",roomname);
    }else{
      waitingusers.push(socket.id);
    }
  });

  socket.on("message",(data)=>{
    const {room,message} = JSON.parse(data);
    socket.broadcast.to(room).emit("message",message);
  });

  socket.on("signalingMessage",function(data){
    socket.broadcast.to(data.room).emit("signalingMessage",data.message);
  })

  socket.on("startVideoCall",function({ room }){
    socket.broadcast.to(room).emit("incomingCall");
  })

  socket.on("acceptCall",function({ room }){
    socket.broadcast.to(room).emit("callAccepted");
  })

  socket.on("rejectCall",function({ room }){
    socket.broadcast.to(room).emit("callRejected");
  });

  socket.on("disconnect",function(){
      let idx=waitingusers.findIndex((waitinguser)=>waitinguser===socket.id);
      if(idx>=0){
        waitingusers.splice(idx,1)
      }
      console.log("user disconnected: "+socket.id);
  });
});

app.use("/",indexRouter);

server.listen(process.env.PORT || 3000,function(){
  console.log("http://localhost:3000");
});