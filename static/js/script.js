import { AliceAvatar } from "aliceavatar";
let head;
let socket;
let subtitle = document.getElementById("subtitle");
let allowFollowMouse
let allowNotifications
let allowSubtitles
let loopQueue = []; // Queue to store pending waitLoop calls

jQuery(document).ready(function () {
  $(".dropdown").hover(
    function () {
      $(".dropdown-menu", this).fadeIn("fast");
    },
    function () {
      $(".dropdown-menu", this).fadeOut("fast");
    }
  );
});

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitLoop(words, wtimes, wdurations, message) {
  // Push the current waitLoop call into the queue
  loopQueue.push({ words, wtimes, wdurations, message });

  // If the queue has only one item, start processing it
  if (loopQueue.length === 1) {
    await processLoopQueue();
  }
}

async function processLoopQueue() {
  // Get the first item from the queue
  const { words, wtimes, wdurations, message } = loopQueue[0];
  // Execute the waitLoop
  subtitle.innerText = message;
  subtitle.style.display = "block";
  // Split the message into words
  const ms = wtimes[wtimes.length - 1] + wdurations[wdurations.length - 1] + 500 + loopQueue.length * 500;
  await wait(ms);
  subtitle.style.display = "none";

  // Remove the processed item from the queue
  loopQueue.shift();

  // If there are more items in the queue, process the next one
  if (loopQueue.length > 0) {
    await processLoopQueue();
  }
}

async function showNotification(message, type) {
  if (!allowNotifications) return;
  const notificationBar = document.getElementById("notification-bar");
  notificationBar.innerText = message;
  notificationBar.className = "notification-bar " + type;
  notificationBar.style.display = "block";
  setTimeout(() => {
    notificationBar.style.display = "none";
  }, 5000);
}

async function loadAvatar(url, cameraView) {
  const nodeAvatar = document.getElementById("avatar");
  nodeAvatar.innerHTML = "";
  head = new AliceAvatar(nodeAvatar, {
    ttsEndpoint: "https://dummyapi.io/data/v1",
    cameraView: cameraView,
    cameraRotateEnable: false,
    pcmSampleRate: 16000,
    modelFPS: 60,
  });
  try {
    await head.showAvatar({
      // https://models.readyplayer.me/65ed5395dce97d1ae1c8a006.glb
      // ../alice_avatar/models/test.glb
      url: url,
      body: "F",
      avatarMood: "neutral",
      lipsyncLang: "en",
    });
  } catch (error) {
    console.log(error);
  }
}

document.addEventListener("DOMContentLoaded", async function (e) {
  await loadAvatar("https://models.readyplayer.me/65ed5395dce97d1ae1c8a006.glb", "head");
  const connectButton = document.getElementById("connect");
  const disconnectButton = document.getElementById("disconnect");
  const sessionIdInput = document.getElementById("session_id");
  connectButton.addEventListener("click", async function () {
    const sessionId = sessionIdInput.value;
    socket = new WebSocket(
      `wss://alicesocket.privateserver.site/ws/${sessionId}`
    );
    socket.onopen = function (event) {
      console.log("Connection established");
      showNotification("Connected successfully to the server 👀", "success");
      socket.send(sessionId);
      sessionIdInput.disabled = true; // Disable session ID input
      connectButton.disabled = true; // Disable connect button
    };

    socket.onclose = function (event) {
      console.log("Connection closed");
      showNotification("Disconnected from the server 😢", "error");
      sessionIdInput.disabled = false; // Enable session ID input on connection close
      connectButton.disabled = false; // Enable connect button on connection close
    };
    // Assign event listener to handle incoming socket messages
    socket.onmessage = async function (event) {
      try {
        if (event.data) {
          const data = JSON.parse(event.data);
          const parsedEvent = JSON.parse(data);
          if (parsedEvent) {
            console.log("Received event:", typeof parsedEvent, parsedEvent);
            console.log(`audio file name: /tts/${parsedEvent.filename}`);
            console.log("tts finished in:", parsedEvent.tts_time, "seconds");
            console.log("stt finished in:", parsedEvent.stt_time, "seconds");
            console.log("words:", parsedEvent.stt_data.words);
            console.log("wtimes:", parsedEvent.stt_data.wtimes);
            console.log("wdurations:", parsedEvent.stt_data.wdurations);
            const uniqueId = parsedEvent.filename;
            let response = await fetch(`../tts/${uniqueId}`);
            let arrayBuffer = await response.arrayBuffer();
            let audioBuffer = await head.audioCtx.decodeAudioData(arrayBuffer);
            let audio = {
              audio: audioBuffer,
              words: parsedEvent.stt_data.words,
              wtimes: parsedEvent.stt_data.wtimes,
              wdurations: parsedEvent.stt_data.wdurations,
            };
            const message = parsedEvent.stt_data.words.join(' ');
            // Push the audio data into the queue
            await head.speakAudio(audio); // Process the audio
            // send stt time and tts time and overall process time as notification each in a new line but all one message and round them to 2 decimal places
            const sttTime = (parsedEvent.stt_time).toFixed(2);
            const ttsTime = (parsedEvent.tts_time).toFixed(2);
            const processTime = (parseFloat(sttTime) + parseFloat(ttsTime)).toFixed(2);
            await showNotification(`stt time: ${sttTime} sec\ntts time: ${ttsTime} sec\noverall process time: ${processTime} sec`, "processing_time");
            if (allowSubtitles) {
              await waitLoop(audio.words, audio.wtimes, audio.wdurations, message);
            }
          }
        }
      } catch (error) {
        console.log(error);
      }
    };

    socket.onerror = function (error) {
      console.error("WebSocket error:", error);
    };
  });

  disconnectButton.addEventListener("click", function () {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
    sessionIdInput.disabled = false; // Enable session ID input on disconnect
  });

  const followToggleSwitch = document.getElementById("followToggleSwitch");
  const notificationToggleSwitch = document.getElementById("notificationToggleSwitch");
  const subtitleToggleSwitch = document.getElementById("subtitlesToggleSwitch");
  allowFollowMouse = followToggleSwitch.checked;
  allowNotifications = notificationToggleSwitch.checked;
  allowSubtitles = subtitleToggleSwitch.checked;

  // Add event listener to the follow toggle switch for change event
  followToggleSwitch.addEventListener("change", function () {
    if (this.checked) {
      // Follow toggle is checked
      allowFollowMouse = true;
    } else {
      // Follow toggle is unchecked
      allowFollowMouse = false;
    }
  });

  // Add event listener to the notification toggle switch for change event
  notificationToggleSwitch.addEventListener("change", function () {
    if (this.checked) {
      // Notification toggle is checked
      allowNotifications = true;
    } else {
      // Notification toggle is unchecked
      allowNotifications = false;
    }
  });

  // Add event listener to the subtitle toggle switch for change event
  subtitleToggleSwitch.addEventListener("change", function () {
    if (this.checked) {
      // Subtitle toggle is checked
      allowSubtitles = true;
      subtitle.style.display = "block";
    } else {
      // Subtitle toggle is unchecked
      allowSubtitles = false;
      subtitle.style.display = "none";
    }
  })
});

document.addEventListener("click", function (event) {
  if (event.target.classList.contains("close-btn")) {
    document.getElementById("notification-bar").style.display = "none";
  }
});

document.addEventListener("click", function (event) {
  if (event.target.classList.contains("emoji-button")) {
    const emoji = event.target.textContent;
    head.speakEmoji(emoji);
  }
})

document.addEventListener("click", function (event) {
  if (event.target.classList.contains("mood-button")) {
    const mood = event.target.textContent;
    head.setMood(mood);
  }
})

document.getElementById("change_avatar").addEventListener("click", function () {
  const avatarUrl = document.getElementById("avatar_url").value;
  const avatarUrlCameraView = document.getElementById("avatar_url_camera_view").value;
  if (avatarUrl) {
    loadAvatar(avatarUrl, avatarUrlCameraView);
  }
})

document.getElementById("change_avatar_file").addEventListener("click", function () {
  const avatarFile = document.getElementById("avatar_file").files[0];
  // get the path of the uploaded file
  const avatarUrl = URL.createObjectURL(avatarFile);
  const avatarUrlCameraView = document.getElementById("avatar_file_camera_view").value;
  if (avatarUrl) {
    loadAvatar(avatarUrl, avatarUrlCameraView);
  }
})

document.addEventListener("click", async function (event) {
  if (event.target.classList.contains("animate-button")) {
    const animation = event.target.innerText;
    await head.playAnimation(`./alice_avatar/animations/${animation}.fbx`, null, 10, 0, 0.01);
  }
})

// Function to calculate distance between two points
function calculateDistance(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

// Function to log mouse position
async function logMousePosition(event) {
  // Get the center of the page
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  // Get mouse position
  const mouseX = event.clientX;
  const mouseY = event.clientY;

  // Calculate distance between mouse position and center of the page
  const distance = calculateDistance(mouseX, mouseY, centerX, centerY);

  // Check if mouse is within the range of 300px from the center
  if (distance <= 300) {
    if (allowFollowMouse) {
      await head.lookAt(mouseX, mouseY, 10);
    }
  }
}

// Add event listener for mousemove
document.addEventListener('mousemove', logMousePosition);
