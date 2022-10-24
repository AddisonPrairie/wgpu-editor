
let baseCode = [
    `struct vertexInput {@location(0) position: vec4<f32>,@location(1) color: vec4<f32>,} struct VertexOut {@builtin(position) position : vec4<f32>,@location(0) color : vec4<f32>,}\n@stage(vertex)\nfn vertex_main(input : vertexInput) -> VertexOut{var output : VertexOut;output.position = input.position;output.color = input.color;return output;}`,
    `struct UniformBG {\n\tresolution : vec2<f32>\n};\n\n@group(0) @binding(0)\nvar <uniform> uniforms : UniformBG;\n\n@stage(fragment)\nfn fragment_main(fragData: VertexOut) -> @location(0) vec4<f32>\n{\n\treturn vec4<f32>(vec3<f32>(fragData.position.x / uniforms.resolution.x), 1.);\n}`
];

var codeEditor = null;
var renderObj = null;

let uniformHandler = {
    types : {
        "f32" : null,
        "i32" : null,
        "u32" : null
    },
    uniformsToString : () => {
        let children = document.querySelector("#uniforms-list").children;

        let jsonArray = [];

        for (var i = 0; i < children.length; i++) {
            if (children[i].className === "uniform") {
                let name = children[i].querySelector(".name").value;
                let type = children[i].querySelector(".select-type").value;
                let width = children[i].querySelector(".select-width").value;
                let list = children[i].querySelector("ul").children;

                let array = [];

                for (var j = 0; j < list.length; j++) {
                    let elem = list[j];
                    array[array.length] = {
                        min : elem.querySelector(".uniform-min").value,
                        max : elem.querySelector(".uniform-max").value,
                        step : elem.querySelector(".uniform-step").value,
                        value : elem.querySelector(".uniform-slider").value
                    };
                }

                jsonArray[jsonArray.length] = {
                    name , 
                    type ,
                    values : array
                };
            }
        }
        return JSON.stringify(jsonArray);
    },
    stringToUniforms : (string) => {
        let jsonArray = JSON.parse(string);

        document.querySelector("#uniforms-list").innerHTML = "";

        for (var i = 0; i < jsonArray.length; i++) {
            var elem = jsonArray[i];
            let addedUniform = uniformHandler.addNewUniform();
            addedUniform.querySelector(".name").value = elem.name;
            addedUniform.querySelector(".select-width").value = elem.values.length;
            addedUniform.querySelector(".select-width").onchange();
            addedUniform.querySelector(".select-type").value = elem.type;

            let modules = addedUniform.querySelector("ul").children;

            let arr = elem.values;

            for (var j = 0; j < modules.length; j++) {
                modules[j].querySelector(".uniform-min").value = arr[j].min;
                modules[j].querySelector(".uniform-max").value = arr[j].max;
                modules[j].querySelector(".uniform-step").value = arr[j].step;
                modules[j].querySelector(".uniform-value").value = arr[j].value;
                modules[j].querySelector(".uniform-slider").min = arr[j].min;
                modules[j].querySelector(".uniform-slider").max = arr[j].max;
                modules[j].querySelector(".uniform-slider").value = arr[j].value;
                modules[j].querySelector(".uniform-slider").step = arr[j].step;
            }
        }
    },
    getBuffer : () => {
        let children = document.querySelector("#uniforms-list").children;
        let bytes = 0;

        let typeValArray = [];

        let offsets = new Array(4);

        offsets[1] = 1;
        offsets[2] = 2;
        offsets[3] = 4;
        offsets[4] = 4;

        for (var i = 0; i < children.length; i++) {
            if (children[i].className === "uniform") {
                let type = children[i].querySelector(".select-type").value;
                let width = children[i].querySelector(".select-width").value;
                let list = children[i].querySelector("ul").children;
                bytes += list.length * 4;
                let diff = (typeValArray.length + 2) % offsets[width];
                diff = (offsets[width] - diff) % offsets[width];
                for (var j = 0; j < diff; j++) {
                    typeValArray[typeValArray.length] = { type , value : 0. };
                }
                for (var j = 0; j < list.length; j++) {
                    typeValArray[typeValArray.length] = { type , value : list[j].querySelector(".uniform-slider").value};
                }
            }
        }

        return typeValArray;
    },
    addNewUniform : () => {
        let newUniform = document.createElement("li");
        newUniform.className = "uniform";
        newUniform.innerHTML = "<input type=\"text\" class=\"name\" value=\"New_Var\"></input>";
        let selectType = document.createElement("select");
        selectType.className = "select-type";

        newUniform.appendChild(selectType);

        let selectWidth = document.createElement("select");
        selectWidth.className = "select-width";
        newUniform.appendChild(selectWidth);

        let deleteButton = document.createElement("a");
        deleteButton.innerHTML = "x";
        deleteButton.className = "uniform-delete";
        deleteButton.addEventListener("mousedown", () => {
            newUniform.remove();
            document.querySelector("#compile").onclick();
        });

        newUniform.appendChild(deleteButton);

        let sizeArray = ``;
        for (var i = 1; i < 5; i++) {
            sizeArray += `<option value = \"${i}\">${i}</option>`;
        }

        selectWidth.innerHTML = sizeArray;
        
        let typeArray = ``;
        for (var x in uniformHandler.types) {
            typeArray += `<option value=\"${x}\">${x}</option>`;
        }
        selectType.innerHTML = typeArray;

        let moduleHolder = document.createElement("ul");

        newUniform.appendChild(moduleHolder);

        let selectChange = () => {
            let numNodes = selectWidth.value;
            moduleHolder.innerHTML = "";
            for (var i = 0; i < numNodes; i++) {
                let moduleWrapper = document.createElement("li");
                moduleWrapper.className = "module";
                let slider = document.createElement("input");
                slider.type = "range";
                slider.className = "uniform-slider";
                slider.id = "slider";
                slider.min = "0";
                slider.max = "1";
                slider.step = ".01";
                slider.value = .5;

                let sliderLabel = document.createElement("label");
                sliderLabel.className = "uniform-label";
                sliderLabel.innerText = "Value: ";
                sliderLabel.setAttribute("for", "slider");

                let value = document.createElement("input");
                value.type = "number";
                value.className = "uniform-value";
                value.classList.add("text-input");

                value.value = slider.value;


                let min = document.createElement("input");
                min.type = "number";
                min.className = "uniform-min";
                min.id = "min";
                min.classList.add("text-input");

                min.value = slider.min;

                let minLabel = document.createElement("label");
                minLabel.className = "uniform-label";
                minLabel.innerText = "Min: ";
                minLabel.setAttribute("for", "min");

                let max = document.createElement("input");
                max.type = "number";
                max.className = "uniform-max";
                max.id = "max";
                max.classList.add("text-input");

                max.value = slider.max;

                let maxLabel = document.createElement("label");
                maxLabel.className = "uniform-label";
                maxLabel.innerText = "Max: ";
                maxLabel.setAttribute("for", "max");

                let step = document.createElement("input");
                step.type = "number";
                step.className = "uniform-step";
                step.id = "step";
                step.classList.add("text-input");

                step.value = slider.step;

                let stepLabel = document.createElement("label");
                stepLabel.className = "uniform-label";
                stepLabel.innerText = "Step: ";
                stepLabel.setAttribute("for", "step");

                slider.oninput = () => { value.value = slider.value;  renderObj.render();};
                value.oninput = () => { slider.value = value.value; renderObj.render();};
                min.oninput = () => { slider.min = min.value; };
                max.oninput = () => { slider.max = max.value; };
                step.oninput = () => {slider.step = step.value; };

                moduleWrapper.appendChild(value);
                moduleWrapper.appendChild(min);
                moduleWrapper.appendChild(slider);
                moduleWrapper.appendChild(max);
                moduleWrapper.appendChild(stepLabel);
                moduleWrapper.appendChild(step);
                moduleHolder.appendChild(moduleWrapper);
            }
            document.querySelector("#compile").onclick();
        };

        selectWidth.onchange = selectChange;

        selectChange();

        

        document.querySelector("#uniforms-list").appendChild(newUniform);
        return newUniform;
    },
};


window.onload = async () => {
    codeEditor = CodeMirror(
        document.querySelector("#code"),
        {
            simple: true,
            mode: "wgsl",
            tabsize: 2,
            lineNumbers: true,
            value: baseCode[1]
        }
    );
    
    renderObj = new createInstance();
    
    await renderObj.recompileShader(baseCode[0] + baseCode[1]);
    await renderObj.render();

    initButtons();
    
    const observer = new ResizeObserver(async entries => {
        await renderObj.render();
    });

    observer.observe(document.querySelector("#render-container"));
};

function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}

async function initButtons() {
    var poppedOut = false;
    document.documentElement.style.setProperty('--uniforms-editor-width', '0px');
    document.documentElement.style.setProperty('--uniforms-editor-show', 'none');
    document.querySelector("#uniform-button").addEventListener("mousedown", (e) => {
        poppedOut = !poppedOut;
        if (poppedOut) {
            e.target.innerHTML = "Close Uniforms";
            document.documentElement.style.setProperty('--uniforms-editor-width', '550px');
            document.documentElement.style.setProperty('--uniforms-editor-show', 'block');
            return;
        }
        e.target.innerHTML = "Open Uniforms";
        document.documentElement.style.setProperty('--uniforms-editor-width', '0px');
        document.documentElement.style.setProperty('--uniforms-editor-show', 'none');
    });

    document.querySelector("#load").onclick = async () => {
        var fileLoader = document.createElement("input");
        fileLoader.type = "file";

        fileLoader.onchange = async () => {
            if (fileLoader.files[0] && fileLoader.files[0].type === "text/plain") {
                let fileReader = new FileReader();
                fileReader.readAsText(fileLoader.files[0]);
                fileReader.onload = () => {
                    let string = fileReader.result;
                    let components = string.split("~|/Slice*Here/|~");
                    uniformHandler.stringToUniforms(components[0]);
                    codeEditor.getDoc().setValue(components[1]);
                    document.querySelector("#compile").onclick();
                };
            }
        }

        fileLoader.click();
    };

    let mouse = {
        x: 0,
        y: 0,
        clicked: false,
        obj: null
    };
    document.querySelector("#render").addEventListener('mousedown', (e) => {
        mouse.clicked = true;
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.obj = document.querySelector("#render-container");
    });
    document.addEventListener('mouseup', (e) => {
        mouse.clicked = false;
    });
    document.addEventListener('mousemove', (e) => {
        if (mouse.clicked) {
            let instanceDiv = mouse.obj;
            instanceDiv.style.top = clamp(instanceDiv.offsetTop + e.clientY - mouse.y, 0, window.innerHeight - instanceDiv.clientHeight) + 'px';
            instanceDiv.style.left = clamp(instanceDiv.offsetLeft + e.clientX - mouse.x, 0, window.innerWidth - instanceDiv.clientWidth) + 'px';
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        }
    });

    document.querySelector("#new-uniform").onclick = uniformHandler.addNewUniform;
    document.querySelector("#compile").onclick = async () => {
        await renderObj.recompileShader(getCode());
        await renderObj.render();
    };

    document.querySelector("#render-button").onclick = renderObj.render;

    document.querySelector("#save").onclick = () => {
        let string = "";
        string += uniformHandler.uniformsToString();
        string += "~|/Slice*Here/|~";
        string += codeEditor.getDoc().getValue();
        download("prog", string);
    };

    document.querySelector("#new").onclick = async () => {
        codeEditor.getDoc().setValue(baseCode[1]);
        document.querySelector("#uniforms-list").innerHTML = "";
        document.querySelector("#compile").onclick();
    };

    //document.querySelector("#download-button").onclick = renderObj.downloadImage;
}


function createInstance() {
    var canvas, holder;
    var adapter, device, shaderCode, ctx, renderPassDescriptor, renderPipeline, 
    uniformBuffer, uniformBytes, vertexBuffer;
    uniformBytes = 24;
    var renderScale = 1.;

    var uniformContainer, uniformWrapper;

    canvas = document.querySelector("#render");
    ctx = canvas.getContext('webgpu', {preserveDrawingBuffer: true});

    this.downloadImage = () => {
        /*
        var link = document.getElementById('link');
  link.setAttribute('download', 'MintyPaper.png');
  link.setAttribute('href', canvas.toDataURL("image/png").replace("image/png", "image/octet-stream"));
  link.click();
        */
       var canvas2 = document.createElement("canvas");
       canvas2.width = canvas.width;
       canvas2.height = canvas.height;
       (canvas2.getContext('2d')).drawImage(canvas.toDataURL(), 0, 0);
       //console.log(canvas2.toDataURL());
       var download = document.createElement("a");
       download.setAttribute('download', 'wgpu_editor_save.png');
       download.setAttribute('href', canvas2.toDataURL("image/png"));
       download.click();

    };

    this.getUniformBytes = () => {
        uniformBytes = 4. * (0 + 2) + uniformHandler.getBuffer().length * 4;
        return uniformBytes;
    }
    this.setRenderScale = (val) => {
        renderScale = val;
        this.render();
    };
    this.setCanvasDetail = (scale) => {
        canvas.width = canvas.clientWidth * scale;
        canvas.height = canvas.clientHeight * scale;
    };
    this.recompileShader = async (code) => {
        adapter = await navigator.gpu.requestAdapter({
            powerPreference : 'high-performance'
        });
        device = await adapter.requestDevice();
        shaderCode = code;
        this.setCanvasDetail(renderScale);
        ctx = await canvas.getContext('webgpu');
        let shaderModule = device.createShaderModule({
            code: shaderCode
        });
        let msgArr = (await shaderModule.compilationInfo()).messages;
        handleError(msgArr);
        const vertices = new Float32Array([
            -1.0, -1.0, 0, 1, 0, 0, 1,
            1.0, -1.0, 0, 0, 1, 0, 1,
            1.0, 1.0, 0, 0, 1, 1, 1,
            -1.0, -1.0, 0, 1, 0, 0, 1,
            -1.0, 1.0, 0, 0, 1, 0, 1,
            1.0, 1.0, 0, 0, 1, 1, 1
        ]);
        vertexBuffer = device.createBuffer({
            size : vertices.byteLength,
            usage: GPUBufferUsage.VERTEX || GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Float32Array(vertexBuffer.getMappedRange()).set(vertices);
        vertexBuffer.unmap();
        var vertexState = {
            module: shaderModule,
            entryPoint: "vertex_main",
            buffers: [{
                attributes: [
                    {
                        shaderLocation: 0,
                        offset: 0,
                        format: "float32x3"
                    },
                    {
                        shaderLocation: 1,
                        offset: 12,
                        format: "float32x4"
                    }
                ],
                arrayStride: 28,
                stepMode: "vertex"
            }]
        };
        var fragmentState = {
            module: shaderModule,
            entryPoint: "fragment_main",
            targets: [
                {
                    format: "bgra8unorm"
                }
            ]
        };
        var bindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: "uniform"
                    }
                }
            ]
        });
        var layout = device.createPipelineLayout({
            bindGroupLayouts : [
                bindGroupLayout
            ]
        });
        renderPipeline = device.createRenderPipeline({
            layout: layout,
            vertex: vertexState,
            fragment: fragmentState
        });
        renderPassDescriptor = {
            colorAttachments: [
                {
                    view : undefined,
                    loadOp : 'clear',
                    clearValue : [.1, .2, .3, 1.],
                    storeOp: 'store'
                }
            ]
        };
        this.getUniformBytes();
        uniformBuffer = device.createBuffer({
            size : uniformBytes,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        uniformBG = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: uniformBuffer
                    }
                }
            ]
        });
    };
    this.render = () => {
        this.setCanvasDetail(renderScale);
        ctx.configure({
            device : device,
            format : 'bgra8unorm'
        });
        var upload = device.createBuffer({
            size : this.getUniformBytes(),
            usage : GPUBufferUsage.COPY_SRC,
            mappedAtCreation : true
        });
        {
            var arrayBuffer = upload.getMappedRange();
            var dataView = new DataView(arrayBuffer);
            dataView.setFloat32(0, ctx.canvas.clientWidth * renderScale, true);
            dataView.setFloat32(4, ctx.canvas.clientHeight * renderScale, true);
            let valArray = uniformHandler.getBuffer();
            for (var i = 2; i < valArray.length + 2; i++) {
                //console.log("doing");
                switch (valArray[i - 2].type) {
                    case "f32":
                        dataView.setFloat32(i * 4, parseFloat(valArray[i - 2].value), true);
                        break;
                    case "i32":
                        dataView.setInt32(i * 4, parseInt(valArray[i - 2].value), true);
                        break;
                    case "u32":
                        dataView.setUint32(i * 4, valArray[i - 2].value, true);
                        break;
                    default:
                }
            }
            upload.unmap();
        }
        renderPassDescriptor.colorAttachments[0].view = ctx.getCurrentTexture().createView();
        var commandEncoder = device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(upload, 0, uniformBuffer, 0, uniformBytes);
        var renderPass = commandEncoder.beginRenderPass(renderPassDescriptor);
        renderPass.setPipeline(renderPipeline);
        renderPass.setBindGroup(0, uniformBG);
        renderPass.setVertexBuffer(0, vertexBuffer);
        renderPass.draw(6);
        renderPass.end();
        device.queue.submit([commandEncoder.finish()]);
    };
}

function getCode() {
    return baseCode[0] + codeEditor.getDoc().getValue();
}

function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
  
    element.style.display = 'none';
    document.body.appendChild(element);
  
    element.click();
  
    document.body.removeChild(element);
  }

let widgetArr = [];

function handleError(errMsg) {
    for (var i = 0; i < widgetArr.length; i++) {
        widgetArr[i].clear();
        //console.log("clearing!");
    }
    
    
    widgetArr = [];

   // console.log(errMsg);
    for (var entry in errMsg) {
        let err = errMsg[entry];
        //console.log(err);
        if (err.type === "error") {
            let lineError = document.createElement("p");
            lineError.className = "error";
            lineError.innerHTML = err.message;
            widgetArr[widgetArr.length] = codeEditor.getDoc().addLineWidget(err.lineNum - 3, lineError);
        }
    }
}