#!/bin/bash
# Script de instalação do ambiente PQC para certificados X.509
# Testado em Ubuntu 22.04/24.04

set -e

echo "=========================================="
echo "Setup de Ambiente PQC para Certificados X.509"
echo "=========================================="

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Diretório de trabalho
WORK_DIR="$HOME/pqc-certificates"
mkdir -p $WORK_DIR
cd $WORK_DIR

echo -e "${YELLOW}[1/6] Instalando dependências...${NC}"
sudo apt update
sudo apt install -y \
    build-essential \
    cmake \
    git \
    libssl-dev \
    ninja-build \
    wget \
    unzip \
    astyle \
    doxygen \
    graphviz \
    python3-pytest \
    python3-pytest-xdist

echo -e "${GREEN}✓ Dependências instaladas${NC}"

echo -e "${YELLOW}[2/6] Clonando liboqs (biblioteca PQC)...${NC}"
if [ ! -d "liboqs" ]; then
    git clone -b main https://github.com/open-quantum-safe/liboqs.git
fi
cd liboqs
mkdir -p build && cd build

echo -e "${YELLOW}[3/6] Compilando liboqs...${NC}"
cmake -GNinja \
    -DCMAKE_INSTALL_PREFIX=$WORK_DIR/liboqs-install \
    -DBUILD_SHARED_LIBS=ON \
    ..
ninja
ninja install

echo -e "${GREEN}✓ liboqs compilado e instalado${NC}"

cd $WORK_DIR

echo -e "${YELLOW}[4/6] Clonando OpenSSL com suporte PQC...${NC}"
if [ ! -d "openssl" ]; then
    git clone -b OQS-OpenSSL_1_1_1-stable https://github.com/open-quantum-safe/openssl.git
fi
cd openssl

echo -e "${YELLOW}[5/6] Compilando OpenSSL com PQC...${NC}"
./config \
    --prefix=$WORK_DIR/openssl-install \
    --openssldir=$WORK_DIR/openssl-install/ssl \
    shared \
    -lm
make -j$(nproc)
make install

echo -e "${GREEN}✓ OpenSSL PQC compilado e instalado${NC}"

cd $WORK_DIR

echo -e "${YELLOW}[6/6] Configurando variáveis de ambiente...${NC}"

# Criar arquivo de configuração
cat > $WORK_DIR/pqc-env.sh << 'EOF'
#!/bin/bash
# Arquivo de ambiente PQC
export WORK_DIR="$HOME/pqc-certificates"
export PATH="$WORK_DIR/openssl-install/bin:$PATH"
export LD_LIBRARY_PATH="$WORK_DIR/openssl-install/lib:$WORK_DIR/liboqs-install/lib:$LD_LIBRARY_PATH"
export OPENSSL_CONF="$WORK_DIR/openssl-install/ssl/openssl.cnf"

alias openssl-pqc="$WORK_DIR/openssl-install/bin/openssl"

echo "Ambiente PQC carregado!"
echo "OpenSSL PQC: $(openssl-pqc version)"
EOF

chmod +x $WORK_DIR/pqc-env.sh

echo ""
echo -e "${GREEN}=========================================="
echo "✓ Instalação concluída com sucesso!"
echo "==========================================${NC}"
echo ""
echo "Para usar o ambiente PQC, execute:"
echo -e "${YELLOW}source $WORK_DIR/pqc-env.sh${NC}"
echo ""
echo "Comandos disponíveis:"
echo "  - openssl-pqc version"
echo "  - openssl-pqc list -public-key-algorithms"
echo ""
echo "Próximos passos:"
echo "  1. source $WORK_DIR/pqc-env.sh"
echo "  2. Veja os scripts de exemplo em: $WORK_DIR"