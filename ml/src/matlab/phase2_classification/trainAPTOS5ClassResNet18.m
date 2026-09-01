%% trainAPTOS5ClassResNet18.m
% APTOS 2019 - 5 Class Diabetic Retinopathy Classification
%
% Classes:
%   0 = No_DR
%   1 = Mild
%   2 = Moderate
%   3 = Severe
%   4 = Proliferative_DR
%
% Input:
%   Enhanced APTOS images
%
% Model:
%   ResNet-18
%
% Output:
%   Trained model
%   Validation accuracy
%   Test accuracy
%   Confusion matrix
%   Per-class accuracy
%   MAT results file
%
% ============================================================

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

fprintf('\nProject root:\n%s\n', projectRoot);

%% ============================================================
% PATHS
% =============================================================

datasetRoot = fullfile( ...
    projectRoot, ...
    'aptos_dataset');

processedFolder = fullfile( ...
    datasetRoot, ...
    'processed');

enhancedFolder = fullfile( ...
    processedFolder, ...
    'enhanced_images');

trainCSV = fullfile( ...
    processedFolder, ...
    'train_5class_labels.csv');

validationCSV = fullfile( ...
    processedFolder, ...
    'validation_5class_labels.csv');

testCSV = fullfile( ...
    processedFolder, ...
    'test_5class_labels.csv');

checkpointFolder = fullfile( ...
    projectRoot, ...
    'ml', ...
    'models', ...
    'checkpoints', ...
    'aptos5class');

reportFolder = fullfile( ...
    projectRoot, ...
    'reports', ...
    'generated', ...
    'aptos', ...
    'aptos5class');

%% ============================================================
% CREATE OUTPUT FOLDERS
% =============================================================

if ~isfolder(checkpointFolder)
    mkdir(checkpointFolder);
end

if ~isfolder(reportFolder)
    mkdir(reportFolder);
end

%% ============================================================
% CHECK FILES
% =============================================================

fprintf('\n========================================\n');
fprintf('CHECKING DATASET\n');
fprintf('========================================\n');

if ~isfolder(enhancedFolder)

    error( ...
        'Enhanced image folder not found:\n%s', ...
        enhancedFolder);

end

if ~isfile(trainCSV)

    error( ...
        'Training CSV not found:\n%s', ...
        trainCSV);

end

if ~isfile(validationCSV)

    error( ...
        'Validation CSV not found:\n%s', ...
        validationCSV);

end

if ~isfile(testCSV)

    error( ...
        'Test CSV not found:\n%s', ...
        testCSV);

end

fprintf('Enhanced images folder : OK\n');
fprintf('Training CSV           : OK\n');
fprintf('Validation CSV         : OK\n');
fprintf('Test CSV               : OK\n');

%% ============================================================
% LOAD CSV FILES
% =============================================================

fprintf('\n========================================\n');
fprintf('LOADING APTOS LABELS\n');
fprintf('========================================\n');

trainTable = readtable( ...
    trainCSV, ...
    'VariableNamingRule','preserve');

validationTable = readtable( ...
    validationCSV, ...
    'VariableNamingRule','preserve');

testTable = readtable( ...
    testCSV, ...
    'VariableNamingRule','preserve');

fprintf('Training   : %d images\n', height(trainTable));
fprintf('Validation : %d images\n', height(validationTable));
fprintf('Test       : %d images\n', height(testTable));

%% ============================================================
% CHECK REQUIRED COLUMNS
% =============================================================

requiredColumns = { ...
    'id_code', ...
    'diagnosis', ...
    'class_label', ...
    'split'};

fprintf('\nChecking CSV columns...\n');

for i = 1:numel(requiredColumns)

    if ~ismember( ...
            requiredColumns{i}, ...
            trainTable.Properties.VariableNames)

        fprintf('\nAvailable columns:\n');
        disp(trainTable.Properties.VariableNames);

        error( ...
            'Required column "%s" not found.', ...
            requiredColumns{i});

    end

end

fprintf('CSV columns verified successfully.\n');

%% ============================================================
% CLASS DEFINITIONS
% =============================================================

classNames = { ...
    'No_DR', ...
    'Mild', ...
    'Moderate', ...
    'Severe', ...
    'Proliferative_DR'};

fprintf('\n========================================\n');
fprintf('CLASS DEFINITIONS\n');
fprintf('========================================\n');

fprintf('0 = No_DR\n');
fprintf('1 = Mild\n');
fprintf('2 = Moderate\n');
fprintf('3 = Severe\n');
fprintf('4 = Proliferative_DR\n');

%% ============================================================
% EXTRACT IMAGE IDs
% =============================================================

trainIDs = string(trainTable.id_code);

validationIDs = string(validationTable.id_code);

testIDs = string(testTable.id_code);

%% ============================================================
% EXTRACT DIAGNOSIS
% =============================================================

trainDiagnosis = trainTable.diagnosis;

validationDiagnosis = validationTable.diagnosis;

testDiagnosis = testTable.diagnosis;

%% ============================================================
% ROBUST DIAGNOSIS CONVERSION
% =============================================================

fprintf('\nConverting diagnosis labels...\n');

% Training

if iscell(trainDiagnosis)

    trainDiagnosis = string(trainDiagnosis);

end

if iscategorical(trainDiagnosis)

    trainDiagnosis = string(trainDiagnosis);

end

if isstring(trainDiagnosis)

    trainDiagnosis = str2double(trainDiagnosis);

end

if ischar(trainDiagnosis)

    trainDiagnosis = str2double(trainDiagnosis);

end

% Validation

if iscell(validationDiagnosis)

    validationDiagnosis = string(validationDiagnosis);

end

if iscategorical(validationDiagnosis)

    validationDiagnosis = string(validationDiagnosis);

end

if isstring(validationDiagnosis)

    validationDiagnosis = str2double(validationDiagnosis);

end

if ischar(validationDiagnosis)

    validationDiagnosis = str2double(validationDiagnosis);

end

% Test

if iscell(testDiagnosis)

    testDiagnosis = string(testDiagnosis);

end

if iscategorical(testDiagnosis)

    testDiagnosis = string(testDiagnosis);

end

if isstring(testDiagnosis)

    testDiagnosis = str2double(testDiagnosis);

end

if ischar(testDiagnosis)

    testDiagnosis = str2double(testDiagnosis);

end

%% Convert to double

trainDiagnosis = double(trainDiagnosis);

validationDiagnosis = double(validationDiagnosis);

testDiagnosis = double(testDiagnosis);

%% ============================================================
% CHECK FOR NaN
% =============================================================

if any(isnan(trainDiagnosis))

    error('NaN values found in training diagnosis.');

end

if any(isnan(validationDiagnosis))

    error('NaN values found in validation diagnosis.');

end

if any(isnan(testDiagnosis))

    error('NaN values found in test diagnosis.');

end

%% ============================================================
% VALIDATE LABEL VALUES
% =============================================================

if any(~ismember(trainDiagnosis,[0 1 2 3 4]))

    error('Invalid training diagnosis detected.');

end

if any(~ismember(validationDiagnosis,[0 1 2 3 4]))

    error('Invalid validation diagnosis detected.');

end

if any(~ismember(testDiagnosis,[0 1 2 3 4]))

    error('Invalid test diagnosis detected.');

end

fprintf('Diagnosis labels verified.\n');

%% ============================================================
% CREATE IMAGE PATHS
% =============================================================

fprintf('\n========================================\n');
fprintf('CREATING IMAGE PATHS\n');
fprintf('========================================\n');

trainFiles = fullfile( ...
    enhancedFolder, ...
    trainIDs + ".png");

validationFiles = fullfile( ...
    enhancedFolder, ...
    validationIDs + ".png");

testFiles = fullfile( ...
    enhancedFolder, ...
    testIDs + ".png");

%% ============================================================
% VERIFY IMAGE FILES
% =============================================================

missingTrain = ~isfile(trainFiles);

missingValidation = ~isfile(validationFiles);

missingTest = ~isfile(testFiles);

fprintf('Missing training images   : %d\n', ...
    sum(missingTrain));

fprintf('Missing validation images : %d\n', ...
    sum(missingValidation));

fprintf('Missing test images       : %d\n', ...
    sum(missingTest));

if any(missingTrain)

    fprintf('\nExample missing training image:\n');

    disp(trainFiles(find(missingTrain,1)));

    error('Training images are missing.');

end

if any(missingValidation)

    fprintf('\nExample missing validation image:\n');

    disp(validationFiles(find(missingValidation,1)));

    error('Validation images are missing.');

end

if any(missingTest)

    fprintf('\nExample missing test image:\n');

    disp(testFiles(find(missingTest,1)));

    error('Test images are missing.');

end

fprintf('All images verified successfully.\n');

%% ============================================================
% CREATE CATEGORICAL LABELS
% =============================================================

fprintf('\n========================================\n');
fprintf('CREATING CATEGORICAL LABELS\n');
fprintf('========================================\n');

trainLabels = categorical( ...
    trainDiagnosis, ...
    [0 1 2 3 4], ...
    classNames);

validationLabels = categorical( ...
    validationDiagnosis, ...
    [0 1 2 3 4], ...
    classNames);

testLabels = categorical( ...
    testDiagnosis, ...
    [0 1 2 3 4], ...
    classNames);

%% ============================================================
% FORCE EXACT CATEGORY ORDER
% =============================================================

trainLabels = reordercats( ...
    trainLabels, ...
    classNames);

validationLabels = reordercats( ...
    validationLabels, ...
    classNames);

testLabels = reordercats( ...
    testLabels, ...
    classNames);

%% ============================================================
% VERIFY CATEGORY ORDER
% =============================================================

fprintf('\nTraining category order:\n');

disp(categories(trainLabels));

fprintf('Validation category order:\n');

disp(categories(validationLabels));

fprintf('Test category order:\n');

disp(categories(testLabels));

expectedCategories = classNames';

if ~isequal( ...
        categories(trainLabels), ...
        expectedCategories)

    error('Training category order is incorrect.');

end

if ~isequal( ...
        categories(validationLabels), ...
        expectedCategories)

    error('Validation category order is incorrect.');

end

if ~isequal( ...
        categories(testLabels), ...
        expectedCategories)

    error('Test category order is incorrect.');

end

fprintf('Class order verified successfully.\n');

%% ============================================================
% CREATE IMAGE DATASTORES
% =============================================================

fprintf('\n========================================\n');
fprintf('CREATING DATASTORES\n');
fprintf('========================================\n');

imdsTrain = imageDatastore( ...
    trainFiles, ...
    'Labels',trainLabels);

imdsValidation = imageDatastore( ...
    validationFiles, ...
    'Labels',validationLabels);

imdsTest = imageDatastore( ...
    testFiles, ...
    'Labels',testLabels);

%% ============================================================
% VERIFY DATASTORE CLASS ORDER
% =============================================================

fprintf('\nTraining datastore classes:\n');

disp(categories(imdsTrain.Labels));

fprintf('Validation datastore classes:\n');

disp(categories(imdsValidation.Labels));

fprintf('Test datastore classes:\n');

disp(categories(imdsTest.Labels));

%% ============================================================
% CLASS DISTRIBUTION
% =============================================================

fprintf('\n========================================\n');
fprintf('TRAIN DISTRIBUTION\n');
fprintf('========================================\n');

trainDistribution = countEachLabel(imdsTrain);

disp(trainDistribution);

fprintf('\n========================================\n');
fprintf('VALIDATION DISTRIBUTION\n');
fprintf('========================================\n');

validationDistribution = countEachLabel(imdsValidation);

disp(validationDistribution);

fprintf('\n========================================\n');
fprintf('TEST DISTRIBUTION\n');
fprintf('========================================\n');

testDistribution = countEachLabel(imdsTest);

disp(testDistribution);

%% ============================================================
% LOAD RESNET-18
% =============================================================

fprintf('\n========================================\n');
fprintf('LOADING RESNET-18\n');
fprintf('========================================\n');

net = resnet18;

inputSize = net.Layers(1).InputSize;

fprintf('Input size: %d x %d x %d\n', ...
    inputSize(1), ...
    inputSize(2), ...
    inputSize(3));

%% ============================================================
% DATA AUGMENTATION
% =============================================================

fprintf('\n========================================\n');
fprintf('CREATING DATA AUGMENTATION\n');
fprintf('========================================\n');

imageAugmenter = imageDataAugmenter( ...
    'RandRotation',[-15 15], ...
    'RandXReflection',true, ...
    'RandXTranslation',[-15 15], ...
    'RandYTranslation',[-15 15], ...
    'RandXScale',[0.90 1.10], ...
    'RandYScale',[0.90 1.10]);

fprintf('Augmentation enabled.\n');

%% ============================================================
% AUGMENTED DATASTORES
% =============================================================

augimdsTrain = augmentedImageDatastore( ...
    inputSize(1:2), ...
    imdsTrain, ...
    'DataAugmentation',imageAugmenter, ...
    'ColorPreprocessing','gray2rgb');

augimdsValidation = augmentedImageDatastore( ...
    inputSize(1:2), ...
    imdsValidation, ...
    'ColorPreprocessing','gray2rgb');

augimdsTest = augmentedImageDatastore( ...
    inputSize(1:2), ...
    imdsTest, ...
    'ColorPreprocessing','gray2rgb');

%% ============================================================
% MODIFY RESNET-18
% =============================================================

fprintf('\n========================================\n');
fprintf('MODIFYING RESNET-18\n');
fprintf('========================================\n');

lgraph = layerGraph(net);

learnableLayer = [];

oldClassificationLayer = [];

for i = 1:numel(lgraph.Layers)

    currentLayer = lgraph.Layers(i);

    if isa( ...
            currentLayer, ...
            'nnet.cnn.layer.FullyConnectedLayer')

        learnableLayer = currentLayer;

    end

    if isa( ...
            currentLayer, ...
            'nnet.cnn.layer.ClassificationOutputLayer')

        oldClassificationLayer = currentLayer;

    end

end

%% ============================================================
% VERIFY LAYERS
% =============================================================

if isempty(learnableLayer)

    error( ...
        'Fully connected layer was not found.');

end

if isempty(oldClassificationLayer)

    error( ...
        'Classification output layer was not found.');

end

fprintf('Original FC layer    : %s\n', ...
    learnableLayer.Name);

fprintf('Original output layer: %s\n', ...
    oldClassificationLayer.Name);

%% ============================================================
% NEW FULLY CONNECTED LAYER
% =============================================================

newFC = fullyConnectedLayer( ...
    5, ...
    'Name','fc_aptos_5class', ...
    'WeightLearnRateFactor',10, ...
    'BiasLearnRateFactor',10);

lgraph = replaceLayer( ...
    lgraph, ...
    learnableLayer.Name, ...
    newFC);

%% ============================================================
% NEW CLASSIFICATION LAYER
% =============================================================

newOutputLayer = classificationLayer( ...
    'Name','classoutput_aptos_5class');

lgraph = replaceLayer( ...
    lgraph, ...
    oldClassificationLayer.Name, ...
    newOutputLayer);

fprintf('Final output classes: 5\n');

%% ============================================================
% VERIFY NETWORK CLASS ORDER
% =============================================================

networkClassNames = newOutputLayer.Classes;

fprintf('\nNetwork output classes:\n');

disp(networkClassNames);

%% ============================================================
% TRAINING SETTINGS
% =============================================================

fprintf('\n========================================\n');
fprintf('TRAINING SETTINGS\n');
fprintf('========================================\n');

miniBatchSize = 16;

maxEpochs = 15;

initialLearningRate = 5e-5;

validationFrequency = max( ...
    1, ...
    floor(numel(trainFiles) / miniBatchSize));

fprintf('Epochs          : %d\n', ...
    maxEpochs);

fprintf('Mini-batch size : %d\n', ...
    miniBatchSize);

fprintf('Learning rate   : %.1e\n', ...
    initialLearningRate);

fprintf('Validation freq : %d\n', ...
    validationFrequency);

%% ============================================================
% TRAINING OPTIONS
% =============================================================

options = trainingOptions( ...
    'sgdm', ...
    'MiniBatchSize',miniBatchSize, ...
    'MaxEpochs',maxEpochs, ...
    'InitialLearnRate',initialLearningRate, ...
    'Momentum',0.9, ...
    'Shuffle','every-epoch', ...
    'ValidationData',augimdsValidation, ...
    'ValidationFrequency',validationFrequency, ...
    'ValidationPatience',5, ...
    'Verbose',true, ...
    'Plots','training-progress', ...
    'ExecutionEnvironment','auto', ...
    'CheckpointPath',checkpointFolder);

%% ============================================================
% TRAIN MODEL
% =============================================================

fprintf('\n========================================\n');
fprintf('APTOS 5-CLASS RESNET-18 TRAINING\n');
fprintf('========================================\n');

fprintf('\nTraining started...\n\n');

[netAPTOS5,info] = trainNetwork( ...
    augimdsTrain, ...
    lgraph, ...
    options);

%% ============================================================
% SAVE MODEL
% =============================================================

modelFile = fullfile( ...
    checkpointFolder, ...
    'retinalResNet18_APTOS_5CLASS.mat');

save( ...
    modelFile, ...
    'netAPTOS5', ...
    'info', ...
    'classNames', ...
    '-v7.3');

fprintf('\n========================================\n');
fprintf('MODEL SAVED\n');
fprintf('========================================\n');

fprintf('%s\n',modelFile);

%% ============================================================
% VALIDATION PREDICTION
% =============================================================

fprintf('\n========================================\n');
fprintf('VALIDATION EVALUATION\n');
fprintf('========================================\n');

validationPred = classify( ...
    netAPTOS5, ...
    augimdsValidation);

validationAccuracy = mean( ...
    validationPred == validationLabels);

fprintf('\nValidation Accuracy: %.2f%%\n', ...
    validationAccuracy * 100);

%% ============================================================
% TEST PREDICTION
% =============================================================

fprintf('\n========================================\n');
fprintf('TEST EVALUATION\n');
fprintf('========================================\n');

testPred = classify( ...
    netAPTOS5, ...
    augimdsTest);

testAccuracy = mean( ...
    testPred == testLabels);

fprintf('\nTest Accuracy: %.2f%%\n', ...
    testAccuracy * 100);

%% ============================================================
% CONFUSION MATRIX
% =============================================================

fprintf('\n========================================\n');
fprintf('CONFUSION MATRIX\n');
fprintf('========================================\n');

figure( ...
    'Name','APTOS 5-Class ResNet-18', ...
    'NumberTitle','off');

cm = confusionchart( ...
    testLabels, ...
    testPred);

cm.Title = ...
    'APTOS 5-Class ResNet-18 - Test Set';

cm.RowSummary = 'row-normalized';

cm.ColumnSummary = 'column-normalized';

%% ============================================================
% NUMERIC CONFUSION MATRIX
% =============================================================

confusionMatrix = confusionmat( ...
    testLabels, ...
    testPred);

fprintf('\nNumeric confusion matrix:\n');

disp(confusionMatrix);

%% ============================================================
% PER-CLASS ACCURACY
% =============================================================

fprintf('\n========================================\n');
fprintf('PER-CLASS ACCURACY\n');
fprintf('========================================\n');

numClasses = numel(classNames);

perClassAccuracy = zeros(numClasses,1);

for i = 1:numClasses

    trueCount = sum( ...
        confusionMatrix(i,:));

    if trueCount > 0

        perClassAccuracy(i) = ...
            confusionMatrix(i,i) / trueCount;

    else

        perClassAccuracy(i) = NaN;

    end

    fprintf( ...
        '%s : %.2f%%\n', ...
        classNames{i}, ...
        perClassAccuracy(i) * 100);

end

%% ============================================================
% PRECISION / RECALL / F1
% =============================================================

fprintf('\n========================================\n');
fprintf('PER-CLASS PRECISION / RECALL / F1\n');
fprintf('========================================\n');

precision = zeros(numClasses,1);

recall = zeros(numClasses,1);

f1Score = zeros(numClasses,1);

for i = 1:numClasses

    TP = confusionMatrix(i,i);

    FP = sum(confusionMatrix(:,i)) - TP;

    FN = sum(confusionMatrix(i,:)) - TP;

    if (TP + FP) > 0

        precision(i) = TP / (TP + FP);

    else

        precision(i) = 0;

    end

    if (TP + FN) > 0

        recall(i) = TP / (TP + FN);

    else

        recall(i) = 0;

    end

    if (precision(i) + recall(i)) > 0

        f1Score(i) = ...
            2 * precision(i) * recall(i) / ...
            (precision(i) + recall(i));

    else

        f1Score(i) = 0;

    end

    fprintf( ...
        '%s | Precision: %.2f%% | Recall: %.2f%% | F1: %.2f%%\n', ...
        classNames{i}, ...
        precision(i)*100, ...
        recall(i)*100, ...
        f1Score(i)*100);

end

%% ============================================================
% MACRO F1
% =============================================================

macroF1 = mean(f1Score);

macroPrecision = mean(precision);

macroRecall = mean(recall);

fprintf('\nMacro Precision: %.2f%%\n', ...
    macroPrecision * 100);

fprintf('Macro Recall   : %.2f%%\n', ...
    macroRecall * 100);

fprintf('Macro F1       : %.2f%%\n', ...
    macroF1 * 100);

%% ============================================================
% SAVE RESULTS
% =============================================================

resultsFile = fullfile( ...
    reportFolder, ...
    'aptos_resnet18_5class_results.mat');

save( ...
    resultsFile, ...
    'testAccuracy', ...
    'validationAccuracy', ...
    'testPred', ...
    'testLabels', ...
    'validationPred', ...
    'validationLabels', ...
    'confusionMatrix', ...
    'perClassAccuracy', ...
    'precision', ...
    'recall', ...
    'f1Score', ...
    'macroF1', ...
    'macroPrecision', ...
    'macroRecall', ...
    'info', ...
    'classNames');

fprintf('\n========================================\n');
fprintf('RESULTS SAVED\n');
fprintf('========================================\n');

fprintf('%s\n',resultsFile);

%% ============================================================
% FINAL SUMMARY
% =============================================================

fprintf('\n========================================\n');
fprintf('APTOS 5-CLASS TRAINING COMPLETED\n');
fprintf('========================================\n');

fprintf('\nValidation Accuracy : %.2f%%\n', ...
    validationAccuracy * 100);

fprintf('Test Accuracy       : %.2f%%\n', ...
    testAccuracy * 100);

fprintf('Macro F1            : %.2f%%\n', ...
    macroF1 * 100);

fprintf('\nClasses:\n');

fprintf('0 = No_DR\n');
fprintf('1 = Mild\n');
fprintf('2 = Moderate\n');
fprintf('3 = Severe\n');
fprintf('4 = Proliferative_DR\n');

fprintf('\nModel:\n');

fprintf('%s\n',modelFile);

fprintf('\nResults:\n');

fprintf('%s\n',resultsFile);

fprintf('\n========================================\n');