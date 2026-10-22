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

# Create runtime symlinks AFTER copying publish output so Linux native libraries override Windows DLLs
RUN mkdir -p /app/x64 /app/tessdata && \
    LEPT_SO=$(find /usr/lib -name "liblept.so*" 2>/dev/null | head -n 1) && \
    TESS_SO=$(find /usr/lib -name "libtesseract.so*" 2>/dev/null | head -n 1) && \
    echo "Using Leptonica: $LEPT_SO, Tesseract: $TESS_SO" && \
    if [ -n "$LEPT_SO" ]; then \
        ln -sf "$LEPT_SO" /app/x64/libleptonica-1.82.0.so && \
        ln -sf "$LEPT_SO" /app/libleptonica-1.82.0.so && \
        ln -sf "$LEPT_SO" /app/x64/libleptonica.so && \
        ln -sf "$LEPT_SO" /app/libleptonica.so; \
    fi && \
    if [ -n "$TESS_SO" ]; then \
        ln -sf "$TESS_SO" /app/x64/libtesseract50.so && \
        ln -sf "$TESS_SO" /app/libtesseract50.so && \
        ln -sf "$TESS_SO" /app/x64/libtesseract.so && \
        ln -sf "$TESS_SO" /app/libtesseract.so && \
        ln -sf "$TESS_SO" /app/x64/libtesseract-5.so && \
        ln -sf "$TESS_SO" /app/libtesseract-5.so; \
    fi && \
    cp -rf /usr/share/tesseract-ocr/*/tessdata/* /app/tessdata/ 2>/dev/null || true && \
    ldconfig

# Default port for container (Render can override with PORT env variable)
ENV ASPNETCORE_HTTP_PORTS=8080
ENV PORT=8080

EXPOSE 8080

ENTRYPOINT ["dotnet", "PocketWise.Api.dll"]
