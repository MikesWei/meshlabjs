///GUARDA DEFERRED SHADING.....
///TODO: PROBLEMI nel CAPIRE QUANDO è in shadow....

/// per ora mi salvo depthmap e positionmap....la depth map funziona bene...positionmap sembra anche
/// lo shader per capire se sono in ombra non va....probabilmente sbagli position map e e trasformazione
///devo lavorare su shadowFrag....current è sbagliato prolly

(function (plugin, core, scene) {

    let SIZE = {width: window.innerWidth, height: window.innerHeight};
//    SIZE = scene.get3DSize();
    let shadowPassUniforms = {
      lightDepthMap: { type: "t", value: null },
      eyeDepthMap: { type: "t", value: null },
      textureSize: { type: "v2", value: null},
      lightPosition: {type: "v3", value: null},
      lightViewProjection: { type: "m4", value: null}
    };

    let depthPassUniforms = {
      variance : { type : "i", value : 0}
    };

    let plug = new plugin.GlobalRendering({
        name: "Shadow Mapping",
        tooltip: "Activate Shadow Mapping render pass",
        toggle: true,
        on: false,
        icon: "img/icons/ambientocclusion.png",
        loadShader : ["SMVertex.glsl", "SMFrag.glsl", "ShadowVertex.glsl", "ShadowFrag.glsl", "PositionVertex.glsl", "PositionFragment.glsl"]
    });

    // let varianceFlag;
    // plug._init = (guiBuilder) => {
    //   varianceFlag = guiBuilder.Bool({
    //     label : "Variance Shadow Mapping",
    //     tooltip : "If checked will apply Variance Shadow Mapping",
    //     defval : false,
    //   });
    // };

    function SMContext() {

      /*
         render target where the depth values will be saved, used as texture
         in the render pass which draws the shadows
      */
      // non posso specificare come solo depth?? su opengl mi pare si possa
      let eyeDepthMapTarget = new THREE.WebGLRenderTarget(SIZE.width, SIZE.height, {
        type: THREE.FloatType,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter
      });

      let lightDepthMapTarget = new THREE.WebGLRenderTarget(SIZE.width, SIZE.height, {
        type: THREE.FloatType,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter
      });
      /*
          material containing the depth pass shaders. The original scene will be
          rendered using this shaders to produce a depth map
      */
      let depthMaterial = new THREE.RawShaderMaterial({
        uniforms: {},
        side: THREE.DoubleSide,
        vertexShader: plug.shaders.getByKey("SMVertex.glsl"),
        fragmentShader: plug.shaders.getByKey("SMFrag.glsl")
      });

      let shadowMaterial = new THREE.RawShaderMaterial({
        uniforms: shadowPassUniforms,
        transparent: true,
        opacity: 0.5,
        blending: THREE["NormalBlending"],
        side: THREE.DoubleSide,
        vertexShader: plug.shaders.getByKey("ShadowVertex.glsl"),
        fragmentShader: plug.shaders.getByKey("ShadowFrag.glsl")
      })


      // poi costruiscilo usando bbox
      let lightCamera = new THREE.OrthographicCamera(
                              -20,
                              20,
                              20,
                              -20,
                              1,
                              25);
      lightCamera.position.set(8, 0, 0);
      lightCamera.lookAt(new THREE.Vector3(0, 0, 0));
      lightCamera.updateProjectionMatrix();
      let projScreenMatrix = new THREE.Matrix4();

      /*
         receives an input buffer in Scene.js and outputs an output buffer that will
         be used as a texture for the last pass of the deferred rendering pipe.
      */
      this.renderShadow = () => {
        //TODO : light is on camera!!! (didn't notice it)..
        // things should be easier then..


        let sceneGraph = scene.getScene();
        let sceneCam = scene.getCamera();
        let renderer = scene.getRenderer();
        SIZE = scene.get3DSize();

        // lightCamera.position.set(new);
        // lightCamera.lookAt(sceneCam.getWorldDirection());
        // lightCamera.updateProjectionMatrix;
        // let dpr = renderer.getPixelRatio();
         eyeDepthMapTarget.setSize(SIZE.width , SIZE.height );
         lightDepthMapTarget.setSize(SIZE.width , SIZE.height );


        sceneGraph.overrideMaterial = depthMaterial;
        renderer.render(sceneGraph, lightCamera, lightDepthMapTarget, true);
        renderer.render(sceneGraph, sceneCam, eyeDepthMapTarget, true);
        //renderer.render(sceneGraph, sceneCam); // if using this remember to comment the final render pass below

        projScreenMatrix.multiplyMatrices(lightCamera.projectionMatrix, lightCamera.matrixWorldInverse);


        shadowPassUniforms.lightViewProjection.value = projScreenMatrix;
        shadowPassUniforms.lightDepthMap.value = lightDepthMapTarget;
        shadowPassUniforms.eyeDepthMap.value = eyeDepthMapTarget;
        shadowPassUniforms.textureSize.value = new THREE.Vector2(SIZE.width, SIZE.height);
        shadowPassUniforms.lightPosition.value = lightCamera.position;

        sceneGraph.overrideMaterial = shadowMaterial;
        renderer.autoClearColor = false;
        renderer.render(sceneGraph, sceneCam);
        renderer.autoClearColor = true;

        shadowPassUniforms.lightViewProjection.value = null;
        shadowPassUniforms.lightDepthMap.value = null;
        shadowPassUniforms.eyeDepthMap.value = null;
        shadowPassUniforms.textureSize.value = null;
        shadowPassUniforms.lightPosition.value = null;
        sceneGraph.overrideMaterial = null;

      };
    }

    let context = null;
    plug._applyTo = (on) => {
        if (on) {
          context = new SMContext();
          scene.setupShadowMapping(context);
        } else {
          context = null;
          scene.disposeShadowMapping();
        }

    };

    plugin.Manager.install(plug);

})(MLJ.core.plugin, MLJ.core, MLJ.core.Scene);