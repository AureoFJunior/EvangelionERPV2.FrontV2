# NERV ERP - React Native + Expo

Sistema ERP completo inspirado em Evangelion, desenvolvido com React Native e Expo para funcionar em Android, iOS e Web.

## 🚀 Tecnologias

- **React Native** - Framework para desenvolvimento mobile
- **Expo** - Plataforma para desenvolvimento React Native
- **TypeScript** - Tipagem estática
- **Victory Native** - Gráficos e visualizações de dados
- **AsyncStorage** - Persistência local de dados
- **Expo Vector Icons** - Ícones (Feather)

## 📱 Funcionalidades

- ✅ **Dashboard** - Visão geral com gráficos em tempo real
- ✅ **Products** - Gerenciamento de inventário de produtos
- ✅ **Customers** - Gestão de clientes
- ✅ **Orders** - Rastreamento de pedidos
- ✅ **Employees** - Gerenciamento de funcionários
- ✅ **Reports** - Relatórios e análises
- ✅ **Tema Claro/Escuro** - Toggle entre temas com estética Evangelion
- ✅ **Responsivo** - Funciona em Android, iOS e Web

## 🎨 Design

O sistema utiliza a paleta de cores inspirada no EVA de Shinji Ikari:
- **Roxo Primário**: #7f3ff2
- **Roxo Secundário**: #b366ff
- **Verde Neon**: #39ff14 (dark) / #00d084 (light)
- **Laranja Accent**: #ff6b35

## 🛠️ Instalação

\`\`\`bash
# Instalar dependências
npm install

# ou
yarn install
\`\`\`

## 📦 Executar

\`\`\`bash
# Iniciar o servidor de desenvolvimento
npm start

# Executar no Android
npm run android

# Executar no iOS
npm run ios

# Executar na Web
npm run web
\`\`\`

## 📂 Estrutura do Projeto

\`\`\`
/
├── App.tsx                 # Componente principal
├── contexts/
│   └── ThemeContext.tsx    # Gerenciamento de tema
├── components/
│   ├── Sidebar.tsx         # Menu lateral
│   ├── ThemeToggle.tsx     # Toggle de tema
│   ├── Dashboard.tsx       # Dashboard com gráficos
│   ├── Products.tsx        # Módulo de produtos
│   ├── Customers.tsx       # Módulo de clientes
│   ├── Orders.tsx          # Módulo de pedidos
│   ├── Employees.tsx       # Módulo de funcionários
│   └── Reports.tsx         # Módulo de relatórios
├── app.json                # Configuração Expo
└── package.json            # Dependências
\`\`\`

## 🌐 Suporte a Plataformas

- ✅ **Android** - Aplicativo nativo Android
- ✅ **iOS** - Aplicativo nativo iOS
- ✅ **Web** - Progressive Web App (PWA)

## 🔧 Configuração

O tema é salvo automaticamente usando AsyncStorage e persiste entre sessões do aplicativo.

## 📝 Notas

- As imagens dos funcionários são carregadas via Unsplash
- Os gráficos são renderizados usando Victory Native
- O sistema é totalmente funcional offline (exceto imagens externas)
- A navegação é otimizada para dispositivos móveis e desktop

## 🎯 Próximos Passos

- Adicionar modais para criar/editar produtos e clientes
- Implementar sistema de notificações
- Adicionar exportação de relatórios em PDF
- Integrar com backend (Supabase ou Firebase)
- Adicionar autenticação de usuários

## 📄 Licença

Este projeto é para fins educacionais e demonstração.

## API & Auth

- Configure `EXPO_PUBLIC_API_BASE_URL` e, opcionalmente, `EXPO_PUBLIC_AUTH_PATH` (padr?o: `/User/LogInto`).
- Endpoint padr?o: `http://localhost:5000/api/v1/User/LogInto/{username}/{password}` (GET).
- Use `useAuth().login({ username, password })` para obter o JWT; o token fica salvo no AsyncStorage e segue em todas as chamadas via `ApiClient`.
- Products, Orders e Reports usam o `ErpService` e carregam dados do backend assim que a autentica??o estiver ativa (mantendo dados de exemplo como fallback).
- Sess?es expiram automaticamente em 1 hora (ou `expiresIn` do backend, se fornecido) e o app faz logout ao vencer.

