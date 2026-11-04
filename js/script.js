
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

    // Prevent duplicate submissions while sending

    sendButton.disabled = true;

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

            buttonText.textContent = "SENT";

            showStatus(
                data.message || "Your message has been sent to the watch.",
                "success"
            );

            return;

        }

        // Other API errors

        throw new Error(
            data.message || "Unable to send your message."
        );

    } catch (error) {

        console.error("Message submission error:", error);

        buttonText.textContent = "SEND TO WATCH";

        showStatus(
            error.message || "Something went wrong. Please try again.",
            "error"
        );

    } finally {

        sendButton.disabled = false;

        // Keep the button ready for another message.
        if (buttonText.textContent === "SENDING...") {
            buttonText.textContent = "SEND TO WATCH";
        }

    }

});
