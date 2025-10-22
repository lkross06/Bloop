import React from "react";
import ReactDOM from "react-dom/client";
import { useState, useEffect } from 'react';

function Button({ onClick }) {
  return <button onClick={onClick}>/GET/test</button>;
}

export default function Message(){
  const [message, setMessage] = useState("");

  function handleClick(){
    //send request to server proxy --> express backend 
    fetch("/test")
      .then(res => res.json())
      .then(data => setMessage(data.message));
  }

  return <>
    <div>
      <Button onClick={() => handleClick()} />
      <p>The message from http://localhost:3000/test is: {message}</p>
    </div>
  </>
}