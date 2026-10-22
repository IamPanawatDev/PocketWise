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

# Install native Tesseract, Thai language data, Leptonica, GDI+ & graphic libraries on Linux
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-tha \
    tesseract-ocr-eng \
    libtesseract-dev \
    libleptonica-dev \
    libgdiplus \
    libc6-dev \
    libjpeg-dev \
    libpng-dev && \
    rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .

# Deploy Linux native libraries (dereferencing real ELF files) to x64 and app directory
RUN mkdir -p /app/x64 /app/tessdata && \
    REAL_LEPT=$(find /usr/lib -name "liblept.so*" -type f 2>/dev/null | head -n 1) && \
    REAL_TESS=$(find /usr/lib -name "libtesseract.so*" -type f 2>/dev/null | head -n 1) && \
    echo "Real Leptonica: $REAL_LEPT, Real Tesseract: $REAL_TESS" && \
    if [ -n "$REAL_LEPT" ]; then \
        cp -L "$REAL_LEPT" /app/x64/libleptonica-1.82.0.so && \
        cp -L "$REAL_LEPT" /app/libleptonica-1.82.0.so && \
        cp -L "$REAL_LEPT" /app/x64/libleptonica.so && \
        cp -L "$REAL_LEPT" /app/libleptonica.so; \
    fi && \
    if [ -n "$REAL_TESS" ]; then \
        cp -L "$REAL_TESS" /app/x64/libtesseract50.so && \
        cp -L "$REAL_TESS" /app/libtesseract50.so && \
        cp -L "$REAL_TESS" /app/x64/libtesseract.so && \
        cp -L "$REAL_TESS" /app/libtesseract.so; \
    fi && \
    cp -rf /usr/share/tesseract-ocr/*/tessdata/* /app/tessdata/ 2>/dev/null || true && \
    ldconfig

# Default port for container (Render can override with PORT env variable)
ENV ASPNETCORE_HTTP_PORTS=8080
ENV PORT=8080

EXPOSE 8080

ENTRYPOINT ["dotnet", "PocketWise.Api.dll"]
