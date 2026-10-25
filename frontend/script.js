
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const chatMessages = document.getElementById("chat-messages");
const sendButton = document.getElementById("send-button");
const suggestionButtons = document.querySelectorAll(".suggestion");

// Add a message bubble to the chat
function addMessage(text, sender) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", `${sender}-message`);

    const avatar = document.createElement("div");
    avatar.classList.add("message-avatar");
avatar.classList.add(sender === "user" ? "profile-avatar" : "robot-avatar");
avatar.setAttribute("aria-hidden", "true");

const content = document.createElement("div");
content.classList.add("message-content");

if (
    sender === "bot" &&
    typeof marked !== "undefined" &&
    typeof DOMPurify !== "undefined"
) {
    content.innerHTML = DOMPurify.sanitize(marked.parse(text));
} else {
    content.textContent = text;
}

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    chatMessages.appendChild(messageDiv);

    chatMessages.scrollTop = chatMessages.scrollHeight;

    return messageDiv;
}

// Send a question to the Flask backend
async function sendMessage(message) {
    const question = message.trim();

    if (!question) {
        return;
    }

    addMessage(question, "user");
    userInput.value = "";
    sendButton.disabled = true;

    const loadingMessage = addMessage("Thinking...", "bot");

    try {
        const response = await fetch("http://127.0.0.1:5000/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: question
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "The request failed.");
        }

        const answer = data.answer || "Sorry, I couldn't generate an answer.";
        const answerContent = loadingMessage.querySelector(".message-content");

        if (typeof marked !== "undefined" && typeof DOMPurify !== "undefined") {
            answerContent.innerHTML = DOMPurify.sanitize(marked.parse(answer));
        } else {
            answerContent.textContent = answer;
        }
    } catch (error) {
        loadingMessage.querySelector(".message-content").textContent =
            "I couldn't connect to the backend. Please check that your Flask server is running and try again.";

        console.error("Chat request failed:", error);
    } finally {
        sendButton.disabled = false;
        userInput.focus();
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Handle the form submission
chatForm.addEventListener("submit", function (event) {
    event.preventDefault();
    sendMessage(userInput.value);
});

// Handle suggested question buttons
suggestionButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        sendMessage(button.dataset.question);
    });
});
