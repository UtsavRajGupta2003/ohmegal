# INTRODUCTION TO <span style="color:red">WEBRTC<span>

We have our <b>LOCAL VIDEO, REMOTE VIDEO</b> and information about our connection as <b>peerConnection</b> so lets store it into the variables.
```
 let localStream;
 let remoteStream;
 let peerConnection;
 let inCall;
```
- Here,<br>
  - ***localStream*** contains our video<br>
  - ***remoteStream*** 
  contains other connected users video<br>
  - ***peerConnection***
  contains information / data about connection between two connected video calling users
  - ***inCall***
  it is a flag require for checking the call is finish or not if the call is ongoing then no need to do video call again?


Now, let's create the initialization function and taking permission for video and audio from the browser and store it into ***localStream*** global variable.

```
  const initialize= async ()=>{
    try{
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });
      document.querySelector("#localVideo").srcObject = localStream;
      document.querySelector("#localVideo").style.display = "block";
      inCall = true;
      initiateOffer();
    }catch(err){
      console.log("Rejected by Browser"+err);
    }
  }
```
we don't know when the response is coming from the user so we just put await and make function as async and **try-catch** block is for **Error Handling** if we get rejection from the browser.
set the ***localStream*** into srcObject of localVideo which is a video tag. ***initiateOffer()*** for the remoteUser 

Now let's see about ***initiateOffer()***:
```
const rtcSettings = {
  iceServers: [{urls:"stun:stun1.l.google.com:19302"}],
};

const initiateOffer = async () =>{
  await createPeerConnection();
}
const createPeerConnection= async() =>{
  peerConnection = new RTCPeerConnection(rtcSettings);
  remoteStream = new MediaStream();
  document.querySelector("#remoteVideo").srcObject = remoteStream;
  document.querySelector("#remoteVideo").style.display = "block";
  document.querySelector("#localVideo").classList.add("smallFrame");

  localStream.getTracks().forEach(track =>{
    peerConnection.addTrack(track,localStream);
  }); 

  peerConnection.ontrack = (event) =>{
    event.stream[0].getTracks().forEach(track => {
      remoteStream.addTrack(track);
    })
  }

  peerConnection.onicecandidate = (event) => {
    if(event.candidate) {
      console.log("Sending Ice Candidates");
      socket.emit("signalingMessage",{
        room,
        message:JSON.stringify({
          type: "candidate",
          candidates: event.candidate
        })
      });
    }
  }

  peerConnection.onconnectionstatechange = () =>{
    console.log("connection state change hui ",peerConnection.connectionState);
  }

}
```
***createPeerConnection()*** is call inside initiateOffer, awaiting for createPeerConnection() for get finished and then run the rest of other functions

In ***createPeerConnection()***, ***RTCPeerConnection()*** is a function present in the browser, and in this case ***RTCPeerConnection()*** is running on both FrontEnd (sender/local and receiver/remote),
this function helps to create connection between two browsers. this function is going to take the **stun server** URL as a input parameter all this information is now stored into the ***peerConnection*** global variable.

### Why are we using stun servers?
As our browser is protected by the FireWall and NAC it won't allow you to get the IP address and other system information so we use stun server to get that information. **stun servers** is used to get the details such as IP address and other information all these information get from the stun servers are <u>sharing data</u>.

We are waiting for the ***createPeerConnection()*** to get information inside a ***initiateOffer()***

Now we are going to make the void ***MediaStream()***, store that void ***MediaStream()*** into ***remoteStream*** global variable.
>--- 
> Void ***MediaStream()*** denotes the blank audio and blank video it is only for initialization of remoteStream.
>
>---

Now once the ***remoteStream*** is ready then set the srcObject for that remoteStream, block the particular video tag and set the class "smallFrame" for **localVideo**
```
document.querySelector("#remoteVideo").srcObject = remoteStream;
document.querySelector("#remoteVideo").style.display = "block";
document.querySelector("#localVideo").classList.add("smallFrame");
```

### Mere side Kaa Connection  
Now we are going to extract the track from the ***localStream*** (track is basically our video and audio track) for this we are using ***getTracks()*** and take one by one track from the ***localStream*** by using ***forEach()*** loop, each track is going to add on the peerConnection which is as follows
```
  localStream.getTracks().forEach(track =>{
    peerConnection.addTrack(track,localStream);
  });
```

### Samne wale kaa Connection
Here we are getting tracks from the receiver side peerConnection variable in ontrack object In that we are getting an event In that event we get the stream array at 0<sup>th</sup> index, we get tracks of recevier side now we are going to add the tracks into remoteStream global variable
```
  peerConnection.ontrack = (event) =>{
  event.stream[0].getTracks().forEach(track => {
    remoteStream.addTrack(track);
  })
```

### IceCandidates AAJAYENGE TAB
sending our details to the receiver side by socket.io we get our details by using function ***onicecandidate()*** we get our details from ***event.candidate***.
we can check the state of peerConnection by ***peerConnection.onconnectionstatechange()*** 
```
peerConnection.onicecandidate = (event) => {
    if(event.candidate) {
      console.log("Sending Ice Candidates");
      socket.emit("signalingMessage",{
        room,
        message:JSON.stringify({
          type: "candidate",
          candidates: event.candidate
        })
      });
    }
  }

  peerConnection.onconnectionstatechange = () =>{
    console.log("connection state change hui ",peerConnection.connectionState);
  }
```
Up to now we are only setting up the ***createPeerConnection()*** , means our candiadtes are connected
Now we have to offer call to receiver by ***peerConnection.createOffer()*** stored that offer information into ***offer*** variable it might going to fail as the offer get rejected so we are writing this code in ***try-catch*** block. After this we have to tell connection that this is the offer from myside, so give our offer to ***peerConnection.setLocalDescription(offer)*** and atlast we send offer from our side to receiver side using ***socket.emit("signalingMessage",{data});***
```
const initiateOffer = async()=>{
  await createPeerConnection();
  try{
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("signalingMessage",{
      room,
      message:JSON.stringify({
        type:"offer",
        offer
      })
    });
  }catch(err){
      console.log("error in create offer"+err)
  }
}
```
we are getting offer from backend through **socketIO** as follows
```
socket.on("signalingMessage",handleSignalingMessage)
```
### @ ***handleSignalingMessage()***
Handle type of offer if it is candidate and peerConnection is ready from sender side then ***peerConnection.addIceCandidate(candidate)*** to the established ***peerConnection***
```
const handleSignalingMessage= async(message) =>{
  const {type,offer,answer,candidate} = JSON.parse(message);
  if(type === "offer") handleOffer(offer);
  if(type === "answer") handleAnswer(answer);
  if(type === "candidate" && peerConnection){
    try{
      await peerConnection.addIceCandidate(candidate);
    }catch(err){
      console.log(err);
    }
  }
  if(type === "hangup"){
    hangup();
  }
}
```
### @ handleOffer()
we receive offer from the receiver side so we ***createPeerConnection()*** setting up the ***peerConnection*** then create answer from myside ***peerConnection.createAnswer();*** store inside the answer variable set that answer to our ***peerConnection.setLocalDescription(answer)*** then emit the **"signalingMessage"** by **socketIO** connection and send my answer to receiver side.
```
const handleOffer = async(offer)=>{
  await createPeerConnection();
  try{
    await peerConnection.setRemoteDescription(offer);
    const answer=await peerConnection.createAnswer();
    peerConnection.setLocalDescription(answer);
    socket.emit("signalingMessage",{
      room,
      message:JSON.stringify({
        type:"answer",
        answer
      })
    });
    inCall = true;
  }catch(err){
    console.log("failed to handle offer");
  }
}
```

### @ handleAnswer()
Once we get answer from the sender side then we have to set incoming answer as ***peerConnection.setRemoteDescription(answer)*** to receiver side. 
```
const handleAnswer = async(answer)=>{
  await createPeerConnection();
  try{
    await peerConnection.setRemoteDescription(answer);
  }catch(err){
    console.log("failed to handle answer");
  }
}
```

# FINALLY HANDLING <p style="color:green"> DOM PART OF BOTH SIDE </p>
  - STEP **I**: 
1. "video-call-btn" click event handling 
```
document.querySelector("#video-call-btn").addEventListner("click",function(){
  socket.emit("startVideoCall",{room});
})
```
2. In backend handle **"startVideoCall"** ***SOCKETIO*** event
    
```
socket.on("startVideoCall",function({room}){
socket.broadcast.to(room).emit("incomingCall");
})
```
  - STEP **II**: "incomingCall" ***socketIO*** event handling
```
socket.on("incomingCall",function(){
  document.querySelector("#incoming-call").classList.remove("hidden");
});
```
  - STEP **III**: 
1. **"accept-call"** click event
```
document.querySelector("#accept-call").addEventListner("click",function(){
  document.querySelector("#incoming-call").classList.add("hidden");
  initialize();
  document.querySelector(".videoblock").classList.remove("hidden");
  socket.emit("acceptCall",{room});
})
```
2. In backend Side we handle 
```
socket.on("acceptCall",function({ room }){
  socket.broadcast.to(room).emit("callAccepted");
})
```
3. Handle **"callAccepted"** ***socketIO*** event on Frontend
```
socket.on("callAccepted",function(){
  initialize();
  document.querySelector(".videoblock").classList.remove("hidden");
})
```
  - STEP **IV**:
1. Handle **"reject-call"** click event
```
document.querySelector("#reject-call").addEventListner("click,function(){
  document.querySelector("#incoming-call").classList.add("hidden");
  socket.emit("rejectCall",{ room })
})
```
2. handle **"rejectCall"** ***socketIO*** event on Backend Side
```
socket.on("rejectCall",function({ room }){
 socket.broadcast.to(room).emit("callRejected");
});
```
3. handle **"callRejected"** ***socketIO*** event on frontend side
```
socket.on("callRejected",function(){
  alert("Call Rejected by Other User");
})
```

  - STEP **V**:

1. Handle ***hangUp()***
```
function hangUp(){
  if(peerConnection){
    peerConnection.close();
    peerConnection = null;
    localStream.getTracks().forEach(track=>{
      track.stop();
    });
    document.querySelector(".videoblock").classList.add("hidden");
    socket.emit("signalingMessage",{
      room,
      message:JSON.stringify({
      type:"hangup"
      })
    })
    inCall=false;
  }
}
```
2. Handle Event for **"hangup"** 
```
document.querySelector("#hangup").addEventListener("click",function(){
  hangUp();
})
```














