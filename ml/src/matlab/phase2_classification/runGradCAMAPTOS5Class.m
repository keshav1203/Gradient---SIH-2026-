%% runGradCAMAPTOS5Class.m
% APTOS 2019
% 5-Class Diabetic Retinopathy Grad-CAM
%
% Classes:
%   0 = No_DR
%   1 = Mild
%   2 = Moderate
%   3 = Severe
%   4 = Proliferative_DR
%
% Model:
%   ResNet-18
%
% Output:
%   - Predicted class
%   - Confidence
%   - Grad-CAM heatmap
%   - Overlay image
%   - JSON result for backend integration

clear;
clc;
close all;

rng(42);

%% ============================================================
% PROJECT ROOT
% =============================================================

scriptFolder = fileparts(mfilename('fullpath'));

projectRoot = fileparts( ...
    fileparts( ...
    fileparts( ...
    fileparts(scriptFolder))));

fprintf('\nProject root:\n%s\n',projectRoot);

%% ============================================================
% PATHS
% =============================================================

modelFile = fullfile( ...
    projectRoot, ...
    'ml', ...
    'models', ...
    'checkpoints', ...
    'aptos5class', ...
    'retinalResNet18_APTOS_5CLASS.mat');

reportFolder = fullfile( ...
    projectRoot, ...
    'reports', ...
    'generated', ...
    'aptos', ...
    'aptos5class', ...
    'gradcam');

%% ============================================================
% CREATE OUTPUT FOLDER
% ============================================================

if ~isfolder(reportFolder)
    mkdir(reportFolder);
end

%% ============================================================
% CHECK MODEL
% ============================================================

if ~isfile(modelFile)

    error( ...
        'APTOS 5-class model not found:\n%s', ...
        modelFile);

end

%% ============================================================
% LOAD MODEL
% ============================================================

fprintf('\n========================================\n');
fprintf('LOADING APTOS 5-CLASS RESNET-18\n');
fprintf('========================================\n');

modelData = load(modelFile);

if isfield(modelData,'netAPTOS5')

    net = modelData.netAPTOS5;

elseif isfield(modelData,'netAPTOS')

    net = modelData.netAPTOS;

elseif isfield(modelData,'net')

    net = modelData.net;

else

    error( ...
        'No compatible network variable found.');

end

fprintf('Model loaded successfully.\n');

%% ============================================================
% CLASS DEFINITIONS
% =============================================================

classNumbers = [0 1 2 3 4];

classNames = { ...
    'No_DR', ...
    'Mild', ...
    'Moderate', ...
    'Severe', ...
    'Proliferative_DR'};

%% ============================================================
% SELECT IMAGE
% =============================================================

fprintf('\n========================================\n');
fprintf('SELECT RETINAL IMAGE\n');
fprintf('========================================\n');

[fileName,filePath] = uigetfile( ...
    {'*.png;*.jpg;*.jpeg', ...
     'Retinal Images (*.png, *.jpg, *.jpeg)'}, ...
    'Select APTOS retinal image');

if isequal(fileName,0)

    fprintf('No image selected.\n');
    return;

end

imageFile = fullfile( ...
    filePath, ...
    fileName);

fprintf('\nSelected image:\n%s\n',imageFile);

%% ============================================================
% LOAD IMAGE
% =============================================================

fprintf('\nLoading image...\n');

I = imread(imageFile);

%% ============================================================
% PREPARE IMAGE
% =============================================================

inputSize = net.Layers(1).InputSize;

Iinput = imresize( ...
    I, ...
    inputSize(1:2));

if size(Iinput,3) == 1

    Iinput = repmat( ...
        Iinput, ...
        1,1,3);

elseif size(Iinput,3) > 3

    Iinput = Iinput(:,:,1:3);

end

%% ============================================================
% PREDICTION
% ============================================================

fprintf('\n========================================\n');
fprintf('RUNNING PREDICTION\n');
fprintf('========================================\n');

[predictedLabel,scores] = classify( ...
    net, ...
    Iinput);

confidence = max(scores);

predictedClassName = string(predictedLabel);

predictedIndex = find( ...
    strcmp(classNames, ...
    char(predictedClassName)), ...
    1);

if isempty(predictedIndex)

    error( ...
        'Predicted class does not match expected classes.');

end

predictedClassNumber = ...
    classNumbers(predictedIndex);

fprintf('\nPrediction:\n');
fprintf( ...
    '%d = %s\n', ...
    predictedClassNumber, ...
    predictedClassName);

fprintf( ...
    'Confidence: %.2f%%\n', ...
    confidence * 100);

%% ============================================================
% FIND GRAD-CAM LAYER
% ============================================================

fprintf('\n========================================\n');
fprintf('FINDING GRAD-CAM LAYER\n');
fprintf('========================================\n');

lgraph = layerGraph(net);

%% Find convolutional layers

convLayerNames = {};

for i = 1:numel(lgraph.Layers)

    currentLayer = lgraph.Layers(i);

    if isa( ...
            currentLayer, ...
            'nnet.cnn.layer.Convolution2DLayer')

        convLayerNames{end+1} = ...
            currentLayer.Name;

    end

end

if isempty(convLayerNames)

    error( ...
        'No convolutional layers found in ResNet-18.');

end

fprintf('Number of convolutional layers: %d\n', ...
    numel(convLayerNames));

%% Use the final convolutional layer

targetLayer = convLayerNames{end};

fprintf( ...
    'Selected Grad-CAM layer: %s\n', ...
    targetLayer);

%% ============================================================
% GRAD-CAM
% ============================================================

fprintf('\n========================================\n');
fprintf('GENERATING GRAD-CAM\n');
fprintf('========================================\n');

try

    scoreMap = gradCAM( ...
        net, ...
        Iinput, ...
        predictedLabel, ...
        'ReductionLayer',targetLayer);

catch ME

    fprintf('\nStandard Grad-CAM call failed.\n');
    fprintf('Trying Grad-CAM without ReductionLayer...\n');

    try

        scoreMap = gradCAM( ...
            net, ...
            Iinput, ...
            predictedLabel);

    catch ME2

        error( ...
            ['Grad-CAM could not be generated.\n\n' ...
             'First error:\n%s\n\n' ...
             'Second error:\n%s'], ...
             ME.message, ...
             ME2.message);

    end

end

%% ============================================================
% NORMALIZE HEATMAP
% ============================================================

scoreMap = double(scoreMap);

scoreMap = scoreMap - min(scoreMap(:));

if max(scoreMap(:)) > 0

    scoreMap = ...
        scoreMap ./ max(scoreMap(:));

end

%% ============================================================
% RESIZE HEATMAP
% =============================================================

heatmap = imresize( ...
    scoreMap, ...
    [size(I,1), size(I,2)]);

%% ============================================================
% CREATE GRAD-CAM OVERLAY
% ============================================================

fprintf('\nCreating Grad-CAM overlay...\n');

figure( ...
    'Visible','off');

imshow(I);

hold on;

imagesc(heatmap);

axis image off;

colormap jet;

colorbar;

alpha(0.45);

title( ...
    sprintf( ...
    'Grad-CAM: %s (%.2f%%)', ...
    char(predictedClassName), ...
    confidence * 100), ...
    'Interpreter','none');

%% ============================================================
% SAVE GRAD-CAM IMAGE
% ============================================================

[~,baseName,~] = fileparts(fileName);

gradcamImageFile = fullfile( ...
    reportFolder, ...
    [baseName '_gradcam.png']);

exportgraphics( ...
    gcf, ...
    gradcamImageFile);

close(gcf);

fprintf('\nGrad-CAM image saved:\n');
fprintf('%s\n',gradcamImageFile);

%% ============================================================
% SAVE RAW HEATMAP
% ============================================================

heatmapFile = fullfile( ...
    reportFolder, ...
    [baseName '_gradcam_heatmap.png']);

heatmapImage = uint8( ...
    255 * heatmap);

imwrite( ...
    heatmapImage, ...
    heatmapFile);

fprintf('\nRaw heatmap saved:\n');
fprintf('%s\n',heatmapFile);

%% ============================================================
% CLASS PROBABILITIES
% ============================================================

probabilities = struct();

for i = 1:numel(classNames)

    fieldName = matlab.lang.makeValidName( ...
        classNames{i});

    probabilities.(fieldName) = ...
        scores(i);

end

%% ============================================================
% CREATE JSON
% ============================================================

result = struct();

result.dataset = ...
    'APTOS 2019';

result.model = ...
    'ResNet-18';

result.task = ...
    '5-Class Diabetic Retinopathy Classification';

result.image = ...
    fileName;

result.predicted_class = ...
    predictedClassNumber;

result.prediction = ...
    char(predictedClassName);

result.confidence = ...
    confidence;

result.confidence_percent = ...
    confidence * 100;

result.class_probabilities = ...
    probabilities;

result.gradcam_layer = ...
    targetLayer;

result.gradcam_image = ...
    gradcamImageFile;

result.heatmap_image = ...
    heatmapFile;

result.generated_at = ...
    char(datetime( ...
    'now', ...
    'Format','yyyy-MM-dd HH:mm:ss'));

%% ============================================================
% SAVE JSON
% ============================================================

jsonFile = fullfile( ...
    reportFolder, ...
    [baseName '_gradcam.json']);

jsonText = jsonencode( ...
    result, ...
    'PrettyPrint',true);

fid = fopen( ...
    jsonFile, ...
    'w');

if fid == -1

    error( ...
        'Could not create Grad-CAM JSON file.');

end

fprintf( ...
    fid, ...
    '%s', ...
    jsonText);

fclose(fid);

%% ============================================================
% FINAL OUTPUT
% ============================================================

fprintf('\n========================================\n');
fprintf('GRAD-CAM COMPLETED\n');
fprintf('========================================\n');

fprintf('\nPrediction:\n');
fprintf( ...
    '%d = %s\n', ...
    predictedClassNumber, ...
    predictedClassName);

fprintf( ...
    'Confidence: %.2f%%\n', ...
    confidence * 100);

fprintf('\nGrad-CAM image:\n');
fprintf('%s\n',gradcamImageFile);

fprintf('\nHeatmap:\n');
fprintf('%s\n',heatmapFile);

fprintf('\nJSON:\n');
fprintf('%s\n',jsonFile);

fprintf('\n========================================\n');