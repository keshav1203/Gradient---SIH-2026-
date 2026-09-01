%% predictAPTOS5Class.m
% APTOS 2019
% ResNet-18 5-Class Diabetic Retinopathy Prediction
%
% Classes:
%   0 = No_DR
%   1 = Mild
%   2 = Moderate
%   3 = Severe
%   4 = Proliferative_DR
%
% Output:
%   - Predicted class
%   - Confidence
%   - All 5 class probabilities
%   - Prediction image
%   - JSON result for backend integration
%
% Model:
%   retinalResNet18_APTOS_5CLASS.mat

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
    'aptos5class', ...
    'retinalResNet18_APTOS_5CLASS.mat');

reportFolder = fullfile( ...
    projectRoot, ...
    'reports', ...
    'generated', ...
    'aptos', ...
    'aptos5class', ...
    'predictions');

%% ============================================================
% CREATE OUTPUT FOLDER
% =============================================================

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
% =============================================================

fprintf('\n========================================\n');
fprintf('LOADING APTOS 5-CLASS RESNET-18\n');
fprintf('========================================\n');

modelData = load(modelFile);

%% Find network variable

if isfield(modelData,'netAPTOS5')

    net = modelData.netAPTOS5;

elseif isfield(modelData,'netAPTOS')

    net = modelData.netAPTOS;

elseif isfield(modelData,'net')

    net = modelData.net;

else

    error( ...
        'No compatible network variable found in model file.');

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

fprintf('\nLoading retinal image...\n');

I = imread(imageFile);

fprintf('Image loaded successfully.\n');

%% ============================================================
% PREPARE IMAGE
% ============================================================

fprintf('\nPreparing image...\n');

inputSize = net.Layers(1).InputSize;

Iinput = imresize( ...
    I, ...
    inputSize(1:2));

%% Ensure RGB

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
fprintf('RUNNING 5-CLASS PREDICTION...\n');
fprintf('========================================\n');

[predictedLabel,scores] = classify( ...
    net, ...
    Iinput);

%% ============================================================
% GET PREDICTED INDEX
% =============================================================

predictedClassName = string(predictedLabel);

predictedIndex = find( ...
    strcmp(classNames, ...
    char(predictedClassName)), ...
    1);

if isempty(predictedIndex)

    error( ...
        'Predicted class "%s" does not match expected class names.', ...
        predictedClassName);

end

predictedClassNumber = ...
    classNumbers(predictedIndex - 1);

confidence = max(scores);

%% ============================================================
% DISPLAY RESULT
% =============================================================

fprintf('\n========================================\n');
fprintf('       APTOS 5-CLASS PREDICTION\n');
fprintf('========================================\n');

fprintf('Class number : %d\n', ...
    predictedClassNumber);

fprintf('Prediction   : %s\n', ...
    predictedClassName);

fprintf('Confidence   : %.2f%%\n', ...
    confidence * 100);

%% ============================================================
% CLASS PROBABILITIES
% =============================================================

fprintf('\nClass probabilities:\n');

probabilities = struct();

for i = 1:numel(classNames)

    probability = scores(i);

    fprintf( ...
        '  %-20s : %.2f%%\n', ...
        classNames{i}, ...
        probability * 100);

    fieldName = matlab.lang.makeValidName( ...
        classNames{i});

    probabilities.(fieldName) = probability;

end

%% ============================================================
% SAVE PREDICTION IMAGE
% =============================================================

[~,baseName,~] = fileparts(fileName);

predictionImageFile = fullfile( ...
    reportFolder, ...
    [baseName '_prediction.png']);

figure( ...
    'Visible','off');

imshow(I);

title( ...
    sprintf( ...
    '%s - %s (%.2f%%)', ...
    num2str(predictedClassNumber), ...
    char(predictedClassName), ...
    confidence * 100), ...
    'Interpreter','none');

exportgraphics( ...
    gcf, ...
    predictionImageFile);

close(gcf);

%% ============================================================
% CREATE JSON RESULT
% =============================================================

result = struct();

%% Dataset information

result.dataset = ...
    'APTOS 2019';

result.model = ...
    'ResNet-18';

result.task = ...
    '5-Class Diabetic Retinopathy Classification';

%% Image information

result.image = ...
    fileName;

%% Prediction

result.prediction = ...
    char(predictedClassName);

result.predicted_class = ...
    predictedClassNumber;

result.confidence = ...
    confidence;

result.confidence_percent = ...
    confidence * 100;

%% All probabilities

result.class_probabilities = ...
    probabilities;

%% Prediction image

result.prediction_image = ...
    predictionImageFile;

%% Timestamp

result.generated_at = ...
    char(datetime( ...
    'now', ...
    'Format','yyyy-MM-dd HH:mm:ss'));

%% ============================================================
% SAVE JSON
% =============================================================

jsonFile = fullfile( ...
    reportFolder, ...
    [baseName '_prediction.json']);

jsonText = jsonencode( ...
    result, ...
    'PrettyPrint',true);

fid = fopen( ...
    jsonFile, ...
    'w');

if fid == -1

    error( ...
        'Could not create prediction JSON.');

end

fprintf( ...
    fid, ...
    '%s', ...
    jsonText);

fclose(fid);

%% ============================================================
% FINAL OUTPUT
% =============================================================

fprintf('\n========================================\n');
fprintf('PREDICTION COMPLETED\n');
fprintf('========================================\n');

fprintf('\nPredicted class:\n');

fprintf( ...
    '  %d = %s\n', ...
    predictedClassNumber, ...
    predictedClassName);

fprintf( ...
    'Confidence: %.2f%%\n', ...
    confidence * 100);

fprintf('\nJSON saved to:\n');
fprintf('%s\n',jsonFile);

fprintf('\nPrediction image saved to:\n');
fprintf('%s\n',predictionImageFile);

fprintf('\n========================================\n');