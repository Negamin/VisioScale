# VisioScale - Medição por Câmera

## Visão Geral
O **VisioScale** é um projeto inovador que permite medir objetos e mapear ambientes utilizando visão computacional e inteligência artificial. O sistema usa uma câmera para capturar imagens e processá-las para estimar dimensões de objetos e calcular a área de um ambiente.

> **Aviso**: O projeto ainda está em desenvolvimento e novas funcionalidades serão adicionadas em futuras atualizações.

## Funcionalidades Principais
- **Calibração**: O sistema pode ser calibrado utilizando objetos de referência conhecidos (cartão de crédito, folha A4 ou dimensões personalizadas).
- **Medição de Objetos**: Mede a largura e altura de objetos na câmera, com base na calibração feita.
- **Mapeamento de Ambientes**: Simula um escaneamento do ambiente para estimar dimensões e área total.
- **Interface Web**: Exibe a transmissão da câmera, permite interações e visualização das medições.

## Tecnologias Utilizadas
- **Linguagem**: Python
- **Framework Backend**: Flask
- **Visão Computacional**: OpenCV
- **Frontend**: HTML, CSS, JavaScript
- **API REST**: Para comunicação entre o frontend e backend

## Estrutura do Projeto
```
MedidaExata/
│-- app.py                # Código principal da aplicação Flask
│-- templates/
│   └── index.html        # Interface principal do sistema
│-- static/
│   ├── css/style.css     # Estilos do frontend
│   ├── js/main.js        # Lógica de interação com a API
│-- README.md             # Documentação do projeto
```

## Como Executar
### Requisitos
- Python 3.8+
- Flask
- OpenCV
- NumPy

### Passos para execução
1. Clone o repositório:
   ```sh
   git clone https://github.com/negamin/VisioScale.git
   cd medidaexata
   ```
2. Instale as dependências:
   ```sh
   pip install -r requirements.txt
   ```
3. Execute a aplicação:
   ```sh
   python app.py
   ```
4. Acesse no navegador:
   ```
   http://localhost:5000
   ```

## Rotas da API
| Método | Rota               | Descrição |
|--------|--------------------|-------------|
| GET    | `/video_feed`      | Retorna o stream da câmera |
| POST   | `/api/calibrate`   | Calibra o sistema com um objeto de referência |
| POST   | `/api/measure`     | Mede um objeto capturado na câmera |
| POST   | `/api/scan/start`  | Inicia o escaneamento do ambiente |
| POST   | `/api/scan/stop`   | Para o escaneamento e retorna dimensões estimadas |
| GET    | `/api/measurements`| Retorna todas as medições realizadas |
| POST   | `/api/reset`       | Reseta os dados coletados |

## Próximas Atualizações
- **Melhoria na detecção de objetos** com algoritmos de IA mais avançados.
- **Adição de SLAM (Simultaneous Localization and Mapping)** para escaneamento realista de ambientes.
- **Suporte a câmeras múltiplas**.

## Contribuições
O projeto está em desenvolvimento e sugestões são bem-vindas. Se quiser contribuir, abra uma issue ou faça um pull request no repositório oficial.

---

_© 2025 VisioScale. Todos os direitos reservados._

