
// ------------------------------
// ELEMENTS
// ------------------------------

const form = document.getElementById("messageForm");

const nameInput = document.getElementById("name");
const messageInput = document.getElementById("message");

const nameCount = document.getElementById("nameCount");
const messageCount = document.getElementById("messageCount");

const sendButton = document.getElementById("sendButton");
const buttonText = document.getElementById("buttonText");

const feedback = document.getElementById("feedback");
const statusText = document.getElementById("statusText");

const countdownWrapper = document.getElementById("countdownWrapper");
const countdown = document.getElementById("countdown");
const progressBar = document.getElementById("progressBar");


// ------------------------------
// CONFIGURATION
// ------------------------------

const MESSAGE_DURATION = 30;

let countdownInterval = null;
let remainingSeconds = 0;
let countdownDuration = MESSAGE_DURATION;


// ------------------------------
// CHARACTER COUNTERS
// ------------------------------

nameInput.addEventListener("input", function () {
    nameCount.textContent = nameInput.value.length;
});

messageInput.addEventListener("input", function () {
    messageCount.textContent = messageInput.value.length;
});


// ------------------------------
// STATUS FUNCTION
// ------------------------------

function showStatus(message, type = "") {

    statusText.textContent = message;

    feedback.className = "feedback";

    if (type) {
        feedback.classList.add(type);
    }

}


// ------------------------------
// LOCK INPUTS
// ------------------------------

function setLocked(locked) {

    nameInput.disabled = locked;
    messageInput.disabled = locked;
    sendButton.disabled = locked;

}


// ------------------------------
// RESTORE DEFAULTS
// ------------------------------

function restoreFields() {

    nameInput.value = "";
    messageInput.value = "";

    nameCount.textContent = "0";
    messageCount.textContent = "0";

}


// ------------------------------
// START COUNTDOWN
// ------------------------------

function startCountdown(
    duration = MESSAGE_DURATION,
    statusMessage = "Your message has been sent to the watch."
) {

    clearInterval(countdownInterval);

    countdownDuration = duration;
    remainingSeconds = duration;

    setLocked(true);

    countdownWrapper.classList.add("active");

    showStatus(statusMessage, "success");

    updateCountdown();

    countdownInterval = setInterval(function () {

        remainingSeconds--;

        updateCountdown();

        if (remainingSeconds <= 0) {

            clearInterval(countdownInterval);

            finishCountdown();

        }

    }, 1000);

}


// ------------------------------
// UPDATE COUNTDOWN DISPLAY
// ------------------------------

function updateCountdown() {

    countdown.textContent = remainingSeconds + "s";

    const progress =
        (remainingSeconds / countdownDuration) * 100;

    progressBar.style.width = progress + "%";

}


// ------------------------------
// FINISH COUNTDOWN
// ------------------------------

function finishCountdown() {

    countdownWrapper.classList.remove("active");

    setLocked(false);

    restoreFields();

    showStatus(
        "Ready to receive a new message."
    );

    buttonText.textContent = "SEND TO WATCH";

}


// ------------------------------
// FORM SUBMISSION
// ------------------------------

form.addEventListener("submit", async function (event) {

    event.preventDefault();

    const name = nameInput.value.trim();
    const message = messageInput.value.trim();

    // Validate empty fields

    if (!name || !message) {

        showStatus(
            "Please enter both your name and message.",
            "error"
        );

        return;

    }

    // Validate character limits

    if (name.length > 60 || message.length > 60) {

        showStatus(
            "Maximum 60 characters per field.",
            "error"
        );

        return;

    }

    // Prevent multiple submissions

    setLocked(true);

    buttonText.textContent = "SENDING...";

    showStatus(
        "Sending your message to the watch..."
    );

    try {

        // Send message to Vercel API

        const response = await fetch("/api/send-message", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                name: name,
                message: message
            })

        });

        const data = await response.json();

        // Successful submission

        if (response.ok && data.success) {

            const duration =
                data.cooldownSeconds || MESSAGE_DURATION;

            buttonText.textContent = "SENT";

            startCountdown(
                duration,
                data.message || "Your message has been sent to the watch."
            );

            return;

        }

        // Watch is currently in cooldown

        if (response.status === 429) {

            const duration =
                data.remainingSeconds || MESSAGE_DURATION;

            buttonText.textContent = "PLEASE WAIT";

            startCountdown(
                duration,
                data.message || "Please wait before sending another message."
            );

            return;

        }

        // Other API errors

        throw new Error(
            data.message || "Unable to send your message."
        );

    } catch (error) {

        console.error("Message submission error:", error);

        setLocked(false);

        buttonText.textContent = "SEND TO WATCH";

        showStatus(
            error.message || "Something went wrong. Please try again.",
            "error"
        );

    }

});
