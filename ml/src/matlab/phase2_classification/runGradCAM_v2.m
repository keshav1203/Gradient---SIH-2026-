%% runGradCAM.m
% APTOS 2019
% ResNet-18 Grad-CAM
%
% Generates:
%   - Original image
%   - Grad-CAM heatmap
%   - Overlay
%   - Prediction
%   - Confidence
%   - JSON backend result
%   - MAT result

clear;
clc;
close all;

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
    'retinalResNet18_APTOS.mat');

reportFolder = fullfile( ...
    projectRoot, ...
    'reports', ...
    'generated', ...
    'aptos', ...
    'gradcam');

if ~isfolder(reportFolder)
    mkdir(reportFolder);
end

%% ============================================================
% LOAD MODEL
% =============================================================

fprintf('\n========================================\n');
fprintf('LOADING APTOS RESNET-18...\n');
fprintf('========================================\n');

modelData = load(modelFile);

if isfield(modelData,'netAPTOS')

    net = modelData.netAPTOS;

elseif isfield(modelData,'net')

    net = modelData.net;

else

    error( ...
        'No compatible network variable found.');

end

fprintf('Model loaded successfully.\n');

%% ============================================================
% SELECT IMAGE
% =============================================================

[fileName,filePath] = uigetfile( ...
    {'*.png;*.jpg;*.jpeg','Retinal Images (*.png, *.jpg, *.jpeg)'}, ...
    'Select retinal image for Grad-CAM');

if isequal(fileName,0)

    fprintf('No image selected.\n');
    return;

end

imageFile = fullfile(filePath,fileName);

fprintf('\nImage:\n%s\n',imageFile);

%% ============================================================
% LOAD IMAGE
% =============================================================

I = imread(imageFile);

originalImage = I;

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
% =============================================================

fprintf('\n========================================\n');
fprintf('RUNNING PREDICTION...\n');
fprintf('========================================\n');

[predictedLabel,scores] = classify( ...
    net, ...
    Iinput);

confidence = max(scores);

fprintf('\nPrediction : %s\n', ...
    string(predictedLabel));

fprintf('Confidence : %.2f%%\n', ...
    confidence * 100);

%% ============================================================
% GRAD-CAM
% =============================================================

fprintf('\n========================================\n');
fprintf('GENERATING GRAD-CAM...\n');
fprintf('========================================\n');

featureLayer = 'res5b_relu';

fprintf('Feature layer: %s\n',featureLayer);

try

    scoreMap = gradCAM( ...
        net, ...
        Iinput, ...
        predictedLabel, ...
        'FeatureLayer', ...
        featureLayer);

catch ME

    fprintf('\nGrad-CAM error:\n%s\n', ...
        ME.message);

    fprintf('\nAvailable layer names:\n');

    for i = 1:numel(net.Layers)

        fprintf('%d: %s\n', ...
            i, ...
            net.Layers(i).Name);

    end

    rethrow(ME);

end

%% ============================================================
% RESIZE HEATMAP
% =============================================================

scoreMap = imresize( ...
    scoreMap, ...
    [size(originalImage,1), ...
     size(originalImage,2)]);

%% ============================================================
% CREATE OVERLAY
% =============================================================

figure('Visible','off');

imshow(originalImage);

hold on;

imagesc(scoreMap);

axis image off;

colormap jet;

colorbar;

alpha(0.45);

title(sprintf( ...
    'APTOS ResNet-18 | %s | %.2f%%', ...
    string(predictedLabel), ...
    confidence * 100));

%% ============================================================
% SAVE GRAD-CAM IMAGE
% =============================================================

[~,baseName,~] = fileparts(fileName);

gradcamFile = fullfile( ...
    reportFolder, ...
    [baseName '_gradcam.png']);

exportgraphics( ...
    gcf, ...
    gradcamFile);

close(gcf);

%% ============================================================
% SAVE RAW HEATMAP
% =============================================================

heatmapFile = fullfile( ...
    reportFolder, ...
    [baseName '_heatmap.png']);

figure('Visible','off');

imagesc(scoreMap);

axis image off;

colormap jet;

colorbar;

title('Grad-CAM Heatmap');

exportgraphics( ...
    gcf, ...
    heatmapFile);

close(gcf);

%% ============================================================
% SAVE MAT DATA
% =============================================================

matFile = fullfile( ...
    reportFolder, ...
    [baseName '_gradcam.mat']);

save( ...
    matFile, ...
    'scoreMap', ...
    'predictedLabel', ...
    'confidence', ...
    'scores', ...
    'featureLayer', ...
    'imageFile');

%% ============================================================
% CREATE JSON
% =============================================================

result = struct();

result.dataset = 'APTOS 2019';

result.model = 'ResNet-18';

result.task = ...
    'Binary Diabetic Retinopathy Classification';

result.image = fileName;

result.prediction = char(predictedLabel);

result.confidence = confidence;

result.confidence_percent = ...
    confidence * 100;

result.gradcam = struct();

result.gradcam.feature_layer = ...
    featureLayer;

result.gradcam.gradcam_image = ...
    gradcamFile;

result.gradcam.heatmap_image = ...
    heatmapFile;

result.gradcam.mat_file = ...
    matFile;

result.generated_at = ...
    char(datetime( ...
    'now', ...
    'Format','yyyy-MM-dd HH:mm:ss'));

%% ============================================================
% SAVE JSON
% =============================================================

jsonFile = fullfile( ...
    reportFolder, ...
    [baseName '_gradcam.json']);

jsonText = jsonencode( ...
    result, ...
    'PrettyPrint',true);

fid = fopen(jsonFile,'w');

if fid == -1
    error('Could not create Grad-CAM JSON.');
end

fprintf(fid,'%s',jsonText);

fclose(fid);

%% ============================================================
% FINAL
% =============================================================

fprintf('\n========================================\n');
fprintf('GRAD-CAM COMPLETED\n');
fprintf('========================================\n');

fprintf('Prediction : %s\n', ...
    string(predictedLabel));

fprintf('Confidence : %.2f%%\n', ...
    confidence * 100);

fprintf('\nGrad-CAM image:\n%s\n', ...
    gradcamFile);

fprintf('\nHeatmap:\n%s\n', ...
    heatmapFile);

fprintf('\nMAT data:\n%s\n', ...
    matFile);

fprintf('\nJSON:\n%s\n', ...
    jsonFile);

fprintf('\n========================================\n');