import os

from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins='*')
UPLOAD_FOLDER = '/static'
ALLOWED_EXTENSIONS = set(['jpg', 'png'])
status = None


@app.route('/')
def home():
    print("SERVER STARTED")
    return render_template('index.html')


@socketio.on('connect')
def test_connect():
    print("SOCKET CONNECTED")


@socketio.on('detections')
def handle_my_custom_event(json, methods=['GET', 'POST']):
    print('received my event: ' + str(json))


@socketio.on('executeFetch')
def executeFetch(directory):
    print('Received')
    emit('folders', os.listdir(directory))


def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/upload', methods=['GET', 'POST'])
def upload_file():
    status = ""
    if request.method == 'POST':
        if 'file' not in request.files:
            return 'No file selected'
        file = request.files['file']
        if file.filename == '':
            return "No file selected"
        if file and allowed_file(file.filename):
            file.save("static/test_images/test.jpg")  # saves in current directory
            status = "File uploaded"
    if status == "File uploaded":
        socketio.emit('uploaded')
    return ('', 204)

@app.route('/uploadLabeled', methods=['GET', 'POST'])
def upload_labeled_file():
    form = request.form
    label = ''
    status = ""
    if form.get('neu') == "on":
        label = form.get('newName')
    else:
        label = form.get('namen')
    if label == '':
        return
    file = request.files['file']
    if os.path.isdir('static/labeled_images/' + label):
        if file and allowed_file(file.filename):
            f = os.listdir('static/labeled_images/'+label)  # dir is your directory path
            number_files = len(f) + 1
            file.save("static/labeled_images/"+label+"/"+str(number_files)+".jpg")  # saves in current directory
            status = "File uploaded"
    else:
        os.mkdir("static/labeled_images/"+label)
        file.save("static/labeled_images/"+label+"/"+"1.jpg")  # saves in current directory
        status = "File uploaded"

    if status == "File uploaded":
        socketio.emit('uploadedLabeled')

    return ('', 204)


@socketio.on('get_status')
def send_status():
    print("Send status now")
    if (status != None):
        emit("response_status")


if __name__ == '__main__':
    socketio.run(app)
