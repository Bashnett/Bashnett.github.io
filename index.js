
const writeupsPerPage = 7; // Number of writeups per page
let currentPage = 1; // Track the current page
let currentTag = ""; // Track the selected tag

function loadMarkdown(element, file, id) {
  const markdownContainer = element.closest(".writeup-box").querySelector(".markdown-content");
  if (markdownContainer.innerHTML) {
      markdownContainer.innerHTML = ""; // Clear content if already loaded
      history.pushState(null, null, window.location.pathname); // Remove the hash from URL
      return;
  }

  fetch(file)
      .then((response) => response.text())
      .then((markdown) => {
          const converter = new showdown.Converter();
          const html = converter.makeHtml(markdown);
          markdownContainer.innerHTML = html;
          history.pushState(null, null, `#${id}`); // Set the URL hash to the writeup ID
          document.getElementById(id).scrollIntoView({
              behavior: "smooth",
              block: "start",
          });
      })
      .catch((error) => console.error("Error loading markdown:", error));
}



  function filterWriteups(tag) {
  // Hide all writeups first
  document.querySelectorAll('.writeup-box').forEach(box => box.style.display = 'none');
  // Show writeups with matching data-tag attribute
  document.querySelectorAll(`.writeup-box[data-tag*="${tag}"]`).forEach(box => box.style.display = 'block');
}

function displayWriteups() {
const writeups = document.querySelectorAll(".writeup-box");
let filteredWriteups = Array.from(writeups);

// Filter writeups based on the selected tag, if any
if (currentTag) {
filteredWriteups = filteredWriteups.filter(writeup =>
  writeup.dataset.tag.includes(currentTag)
);
}

const totalWriteups = filteredWriteups.length;
const totalPages = Math.ceil(totalWriteups / writeupsPerPage);

// Hide all writeups initially
writeups.forEach(writeup => {
writeup.style.display = "none";
});

// Show writeups for the current page of the filtered list
const start = (currentPage - 1) * writeupsPerPage;
const end = start + writeupsPerPage;
for (let i = start; i < end && i < totalWriteups; i++) {
filteredWriteups[i].style.display = "block";
}

// Update pagination controls
const paginationControls = document.getElementById("pagination-controls");
paginationControls.innerHTML = "";
for (let i = 1; i <= totalPages; i++) {
const button = document.createElement("button");
button.textContent = i;
button.classList.toggle("active", i === currentPage);
button.onclick = () => {
  currentPage = i;
  displayWriteups();
};
paginationControls.appendChild(button);
}
}

function filterByTag(tag) {
currentTag = tag;  // Set the selected tag
currentPage = 1;   // Reset to the first page of the filtered results
displayWriteups(); // Redisplay the writeups based on the selected tag
}

// Initialize pagination display
displayWriteups();


document.addEventListener('DOMContentLoaded', () => {
  const hash = window.location.hash.slice(1); // Remove the '#' symbol
  if (hash) {
      const writeupBox = document.getElementById(hash);
      if (writeupBox) {
          const link = writeupBox.querySelector("a");
          const file = link.getAttribute("onclick").match(/'([^']+)'/)[1]; // Extract file path
          loadMarkdown(link, file, hash);
      }
  }
  displayWriteups(); // Initialize the writeups display
});
