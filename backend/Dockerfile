# Stage 1: Build & Publish
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project files and restore dependencies
COPY ["src/PocketWise.Api/PocketWise.Api.csproj", "src/PocketWise.Api/"]
COPY ["src/PocketWise.Application/PocketWise.Application.csproj", "src/PocketWise.Application/"]
COPY ["src/PocketWise.Domain/PocketWise.Domain.csproj", "src/PocketWise.Domain/"]
COPY ["src/PocketWise.Infrastructure/PocketWise.Infrastructure.csproj", "src/PocketWise.Infrastructure/"]
RUN dotnet restore "src/PocketWise.Api/PocketWise.Api.csproj"

# Copy source code and build/publish
COPY . .
WORKDIR "/src/src/PocketWise.Api"
RUN dotnet publish "PocketWise.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# Install native Tesseract, Thai language data & Leptonica libraries required by Tesseract OCR on Linux (Ubuntu 24.04 base)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-tha \
    tesseract-ocr-eng \
    libtesseract-dev \
    libleptonica-dev \
    libc6-dev \
    libjpeg-dev \
    libpng-dev && \
    rm -rf /var/lib/apt/lists/*

# Create x64 directory expected by charlesw/tesseract wrapper on Linux and symlink native libraries
RUN mkdir -p /app/x64 && \
    find /usr/lib -name "liblept.so*" -exec ln -sf {} /app/x64/libleptonica-1.82.0.so \; -quit && \
    find /usr/lib -name "liblept.so*" -exec ln -sf {} /app/x64/libleptonica.so \; -quit && \
    find /usr/lib -name "libtesseract.so*" -exec ln -sf {} /app/x64/libtesseract50.so \; -quit && \
    find /usr/lib -name "libtesseract.so*" -exec ln -sf {} /app/x64/libtesseract.so \; -quit && \
    ldconfig

COPY --from=build /app/publish .

# Ensure tessdata has Thai traineddata from either publish or system apt
RUN mkdir -p /app/tessdata && \
    cp -rn /usr/share/tesseract-ocr/*/tessdata/* /app/tessdata/ 2>/dev/null || true

# Default port for container (Render can override with PORT env variable)
ENV ASPNETCORE_HTTP_PORTS=8080
ENV PORT=8080

EXPOSE 8080

ENTRYPOINT ["dotnet", "PocketWise.Api.dll"]
