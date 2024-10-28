
function fadeIn(button) {
    button.style.display = 'flex'; // Make the button visible
    button.classList.remove('fade-out'); // Remove fade-out class if it exists
    button.classList.add('fade-in'); // Add fade-in class

    setTimeout(() => {
        button.classList.remove('fade-in'); // Reset for future use
    }, 500);
}

function fadeOut(button) {
  
    button.classList.remove('fade-in'); // Remove fade-in class
    button.classList.add('fade-out'); // Add fade-out class

    // Hide the button after the animation completes
    setTimeout(() => {
        button.style.display = 'none';
    }, 500); // Match this to your animation duration
}

function animateBackground(ctx, pattern, canvas) {
  let offsetX = -50; // Initial X offset for scrolling
  const speed = 1;  // Speed of the background movement

  function draw() {
    // Clear the canvas for each frame to prevent overlap
    ctx.clearRect(0, 0, screen.width * 2, canvas.height);

    // Save the context state before applying translation
    ctx.save();

    // Apply translation to create the scrolling effect
    ctx.translate(offsetX, 0);
    ctx.fillStyle = '#cce6ff';
    ctx.fillRect(offsetX, 0, screen.width*2, canvas.height);
    ctx.fillRect(offsetX + (screen.width * 2), 0, screen.width*2, canvas.height);

    // Fill the entire canvas with the background pattern
    ctx.fillStyle = pattern;
    // Draw two patterns side by side to create the loop
    ctx.fillRect(offsetX, 0, screen.width * 2, canvas.height); // First pattern
    ctx.fillRect(offsetX + (screen.width * 2), 0, screen.width * 2, canvas.height); // First pattern

    // Restore the context state
    ctx.restore();

    // Update the X offset to create scrolling motion
    offsetX -= speed;

    // Reset the offset to prevent it from becoming too large (looping the pattern)
    if (offsetX <= -screen.width + 95) {
      offsetX = 0;
    }

    // Request the next animation frame
    requestAnimationFrame(draw);
  }

  // Start the animation loop
  requestAnimationFrame(draw);
}

module.exports = {
  fadeIn,
  fadeOut,
  animateBackground
};
