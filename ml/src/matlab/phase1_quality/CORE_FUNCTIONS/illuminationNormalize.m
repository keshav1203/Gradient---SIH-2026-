function Inorm = illuminationNormalize(I, mask)
% Removes uneven illumination via large-kernel Gaussian background
% estimation ("shade correction"), applied per color channel.
    sigma = max(5, round(min(size(I,1), size(I,2)) / 20));
    Inorm = zeros(size(I));
    for c = 1:3
        ch = I(:,:,c);
        bg = imgaussfilt(ch, sigma);
        meanBg = mean(bg(mask));
        corrected = ch - bg + meanBg;
        corrected(~mask) = 0;
        Inorm(:,:,c) = corrected;
    end
    Inorm = min(max(Inorm, 0), 1);
end
