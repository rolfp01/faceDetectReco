const socket = io.connect('http://127.0.0.1:5000');
let oldCanvas;
let started = false;
socket.on( 'connect', function() {
    console.log("SOCKET CONNECTED")
    if (started)
    {
        loadNames()
        showTestImage()
    }
})

const size = 512;
const varity = 0.5;

socket.on('uploaded', () => {
    loadNames()
    showTestImage()
})

socket.on('uploadedLabeled', () => {
    loadNames()
    showTestImage()
})

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
Promise.all([
    faceapi.loadSsdMobilenetv1Model("http://127.0.0.1:5000/static/models/"),
    faceapi.loadFaceLandmarkModel("http://127.0.0.1:5000/static/models/"),
    faceapi.loadFaceRecognitionModel("http://127.0.0.1:5000/static/models/"),
    //faceapi.loadTinyFaceDetectorModel("http://127.0.0.1:5000/static/models/")
])
    .then(startPage)
    .catch(err => console.error(err));

function startPage() {
    console.log("startPage");
    started = true;
    const image = document.getElementById("testImage");
    loadNames();
    showTestImage();
    // load(image).then();
}

async function showTestImage() {
    console.log("showTestImage")
    const image = document.getElementById("testImage");
    image.src = image.src.split("?")[0] + "?" + new Date().getTime();
    setTimeout(()=>load(image).then() , 500);
}

async function load(image)
{
    console.log("load")
    if (oldCanvas !== undefined)
    {
        const context = oldCanvas.getContext("2d");
        context.clearRect(0, 0, oldCanvas.width, oldCanvas.height);
    }
    const canvas = faceapi.createCanvasFromMedia(image);
    document.body.append(canvas);
    const displaySize = { width: image.width, height: image.height }
    faceapi.matchDimensions(canvas, displaySize);

    let detections = await faceapi
        .detectAllFaces(image/*, new faceapi.TinyFaceDetectorOptions({size, varity})*/)
        .withFaceLandmarks()
        .withFaceDescriptors();
    socket.emit( 'detections', {
        data: detections
    })
    const results = faceapi.resizeResults(detections, displaySize)
    const namedImages = await loadNamedImages()
    const maxDescriptorDistance = 0.6
    const faceMatcher = new faceapi.FaceMatcher(namedImages, maxDescriptorDistance)
    results.forEach(({ detection, descriptor }) => {
        const label = faceMatcher.findBestMatch(descriptor).toString()
        const options = { label }
        const drawBox = new faceapi.draw.DrawBox(detection.box, options)
        drawBox.draw(canvas)
    })
    oldCanvas= canvas;
}

async function loadNamedImages()
{
    const result = [];
    socket.emit('executeFetch', 'static/labeled_images')

    const names = await fetchFoldersFromEmit();
    console.log(names);
    for (const label of names) {
        const descriptorsToName = [];
        socket.emit('executeFetch', 'static/labeled_images/'+label);
        const images = await fetchFoldersFromEmit();
        console.log(images);
        for (const image of images)
        {
            // fetch image data from urls and convert blob to HTMLImage element
            console.log(label, image);
            const imgUrl = `../static/labeled_images/${label}/${image}`
            const img = await faceapi.fetchImage(imgUrl);

            // detect the face with the highest score in the image and compute it's landmarks and face descriptor
            const fullFaceDescription = await faceapi.computeFaceDescriptor(img);

            if (!fullFaceDescription) {
                console.warn(`no faces detected for ${label}: ${image}`)
            }else{
                descriptorsToName.push(fullFaceDescription);
            }

        }
        if(descriptorsToName.length !== 0){
            result.push(new faceapi.LabeledFaceDescriptors(label, descriptorsToName));
        }
    }
    return result;
}

async function fetchFoldersFromEmit() {
    return new Promise(function(resolve) {
        socket.on("folders", data => resolve(data))
    });
}

async function loadNames()
{
    console.log("loadNames");
    socket.emit('executeFetch', 'static/labeled_images')
    //document.getElementById("namen").innerHTML=""
    const names = await fetchFoldersFromEmit();
    const namen = [];
    names.forEach((name) => {
        var einzufuegendesObjekt = document.createElement("option");
        einzufuegendesObjekt.value = name;
        einzufuegendesObjekt.innerHTML = name;
        namen.push(einzufuegendesObjekt);
    })
    $("#namen").empty();
    $("#namen").append(namen);
}
