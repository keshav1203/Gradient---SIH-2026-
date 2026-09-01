%% prepareAPTOS5Class.m
% APTOS 2019 Dataset Preparation
% 5-Class Classification
%
% 0 = No_DR
% 1 = Mild
% 2 = Moderate
% 3 = Severe
% 4 = Proliferative_DR

clear;
clc;

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

rawFolder = fullfile( ...
    projectRoot, ...
    'aptos_dataset', ...
    'raw');

csvFile = fullfile( ...
    rawFolder, ...
    'train.csv');

imageFolder = fullfile( ...
    rawFolder, ...
    'train_images');

processedFolder = fullfile( ...
    projectRoot, ...
    'aptos_dataset', ...
    'processed');

%% ============================================================
% CREATE FOLDER
% =============================================================

if ~isfolder(processedFolder)
    mkdir(processedFolder);
end

%% ============================================================
% CHECK FILES
% =============================================================

if ~isfile(csvFile)
    error('train.csv not found:\n%s',csvFile);
end

if ~isfolder(imageFolder)
    error('train_images folder not found:\n%s',imageFolder);
end

%% ============================================================
% READ ORIGINAL APTOS CSV
% =============================================================

fprintf('\n========================================\n');
fprintf('LOADING APTOS DATASET\n');
fprintf('========================================\n');

T = readtable( ...
    csvFile, ...
    'VariableNamingRule','preserve');

fprintf('Total records: %d\n',height(T));

%% ============================================================
% CHECK ORIGINAL COLUMNS
% =============================================================

fprintf('\nOriginal columns:\n');
disp(T.Properties.VariableNames);

if ~ismember('id_code',T.Properties.VariableNames)
    error('id_code column not found.');
end

if ~ismember('diagnosis',T.Properties.VariableNames)
    error('diagnosis column not found.');
end

%% ============================================================
% EXTRACT REQUIRED DATA ONLY
% =============================================================

id_code = string(T.id_code);
diagnosis = double(T.diagnosis);

%% ============================================================
% CHECK DIAGNOSIS
% =============================================================

if any(~ismember(diagnosis,[0 1 2 3 4]))
    error('Invalid diagnosis values detected.');
end

%% ============================================================
% CREATE CLASS LABELS
% =============================================================

class_label = strings(height(T),1);

class_label(diagnosis == 0) = "No_DR";
class_label(diagnosis == 1) = "Mild";
class_label(diagnosis == 2) = "Moderate";
class_label(diagnosis == 3) = "Severe";
class_label(diagnosis == 4) = "Proliferative_DR";

%% ============================================================
% CREATE CLEAN TABLE
% =============================================================

cleanTable = table( ...
    id_code, ...
    diagnosis, ...
    class_label);

%% ============================================================
% CHECK IMAGE FILES
% =============================================================

fprintf('\nChecking image files...\n');

validImage = false(height(cleanTable),1);

for i = 1:height(cleanTable)

    imageID = cleanTable.id_code(i);

    pngPath = fullfile( ...
        imageFolder, ...
        imageID + ".png");

    jpgPath = fullfile( ...
        imageFolder, ...
        imageID + ".jpg");

    jpegPath = fullfile( ...
        imageFolder, ...
        imageID + ".jpeg");

    if isfile(pngPath) || ...
       isfile(jpgPath) || ...
       isfile(jpegPath)

        validImage(i) = true;

    end

end

fprintf('Valid images  : %d\n',sum(validImage));
fprintf('Missing images: %d\n',sum(~validImage));

if any(~validImage)

    warning( ...
        '%d images are missing. They will be removed.', ...
        sum(~validImage));

    cleanTable = cleanTable(validImage,:);

end

fprintf('Final records: %d\n',height(cleanTable));

%% ============================================================
% ORIGINAL 5-CLASS DISTRIBUTION
% =============================================================

fprintf('\n========================================\n');
fprintf('5-CLASS DISTRIBUTION\n');
fprintf('========================================\n');

disp(groupcounts(cleanTable,'diagnosis'));

%% ============================================================
% STRATIFIED TEST SPLIT
% ============================================================

fprintf('\nCreating stratified splits...\n');

% 15% test
cvTest = cvpartition( ...
    categorical(cleanTable.diagnosis), ...
    'HoldOut',0.15);

testIdx = test(cvTest);
trainValIdx = training(cvTest);

Ttest = cleanTable(testIdx,:);
TtrainVal = cleanTable(trainValIdx,:);

%% ============================================================
% STRATIFIED VALIDATION SPLIT
% ============================================================

% Remaining data = 85%
% Need 15% of total for validation.
%
% 0.15 / 0.85 = 0.17647

cvValidation = cvpartition( ...
    categorical(TtrainVal.diagnosis), ...
    'HoldOut',0.17647);

validationIdx = test(cvValidation);
trainIdx = training(cvValidation);

Tvalidation = TtrainVal(validationIdx,:);
Ttrain = TtrainVal(trainIdx,:);

%% ============================================================
% ADD SPLIT COLUMN
% =============================================================

Ttrain.split = repmat( ...
    "train", ...
    height(Ttrain),1);

Tvalidation.split = repmat( ...
    "validation", ...
    height(Tvalidation),1);

Ttest.split = repmat( ...
    "test", ...
    height(Ttest),1);

%% ============================================================
% ENSURE COLUMN ORDER
% =============================================================

Ttrain = Ttrain(:, ...
    {'id_code','diagnosis','class_label','split'});

Tvalidation = Tvalidation(:, ...
    {'id_code','diagnosis','class_label','split'});

Ttest = Ttest(:, ...
    {'id_code','diagnosis','class_label','split'});

%% ============================================================
% SAVE CSV FILES
% =============================================================

trainCSV = fullfile( ...
    processedFolder, ...
    'train_5class_labels.csv');

validationCSV = fullfile( ...
    processedFolder, ...
    'validation_5class_labels.csv');

testCSV = fullfile( ...
    processedFolder, ...
    'test_5class_labels.csv');

writetable(Ttrain,trainCSV);

writetable(Tvalidation,validationCSV);

writetable(Ttest,testCSV);

%% ============================================================
% COMBINED METADATA
% =============================================================

Tall = [ ...
    Ttrain;
    Tvalidation;
    Ttest];

allCSV = fullfile( ...
    processedFolder, ...
    'aptos_5class_labels.csv');

writetable(Tall,allCSV);

%% ============================================================
% SAVE MAT FILE
% =============================================================

matFile = fullfile( ...
    processedFolder, ...
    'aptos_5class_metadata.mat');

save( ...
    matFile, ...
    'Tall', ...
    'Ttrain', ...
    'Tvalidation', ...
    'Ttest');

%% ============================================================
% DISPLAY SPLIT SIZES
% =============================================================

fprintf('\n========================================\n');
fprintf('DATASET SPLIT\n');
fprintf('========================================\n');

fprintf('Training   : %d\n',height(Ttrain));
fprintf('Validation : %d\n',height(Tvalidation));
fprintf('Test       : %d\n',height(Ttest));

%% ============================================================
% TRAIN DISTRIBUTION
% =============================================================

fprintf('\n========================================\n');
fprintf('TRAIN DISTRIBUTION\n');
fprintf('========================================\n');

disp(groupcounts(Ttrain,'diagnosis'));

%% ============================================================
% VALIDATION DISTRIBUTION
% =============================================================

fprintf('\n========================================\n');
fprintf('VALIDATION DISTRIBUTION\n');
fprintf('========================================\n');

disp(groupcounts(Tvalidation,'diagnosis'));

%% ============================================================
% TEST DISTRIBUTION
% =============================================================

fprintf('\n========================================\n');
fprintf('TEST DISTRIBUTION\n');
fprintf('========================================\n');

disp(groupcounts(Ttest,'diagnosis'));

%% ============================================================
% FINISHED
% =============================================================

fprintf('\n========================================\n');
fprintf('APTOS 5-CLASS PREPARATION COMPLETED\n');
fprintf('========================================\n');

fprintf('\nFiles saved:\n');

fprintf('%s\n',trainCSV);
fprintf('%s\n',validationCSV);
fprintf('%s\n',testCSV);
fprintf('%s\n',allCSV);
fprintf('%s\n',matFile);

fprintf('\nCSV columns:\n');
fprintf('id_code | diagnosis | class_label | split\n');

fprintf('\n========================================\n');