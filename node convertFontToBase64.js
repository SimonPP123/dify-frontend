// Fetch the Roboto font from a CDN and convert it to Base64
fetch('https://cdnjs.cloudflare.com/ajax/libs/roboto/2.138/fonts/Roboto-Regular.ttf')
  .then(response => response.arrayBuffer())
  .then(buffer => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = window.btoa(binary);
    console.log(base64);
  })
  .catch(error => console.error('Error fetching the font:', error));
