function Iout = denoiseImage(I)
% Non-local means denoising, applied per channel.
% SearchWindowSize reduced from the 21x21 default to 11x11 to roughly
% halve runtime with negligible visible quality difference on fundus
% images (still cleans sensor noise while preserving vessel detail).
    Iout = zeros(size(I));
    for c = 1:3
        Iout(:,:,c) = imnlmfilt(I(:,:,c), 'DegreeOfSmoothing', 0.05, ...
            'SearchWindowSize', 11, 'ComparisonWindowSize', 5);
    end
end
