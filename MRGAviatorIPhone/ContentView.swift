import SwiftUI
import WebKit
import Foundation

// MRG iPhone nativo - arquitetura igual Android:
// Topo MRG nativo + WKWebView embaixo carregando 7K/Aviator.

let SUPABASE_URL = "https://bflptqejltvwfjhixwpj.supabase.co"
let SUPABASE_KEY = "sb_publishable_b2JbHd6f4drsWQIFgKEyRQ_QEDi4ODO"
let URL_AVIATOR = "https://7k.bet.br/cassino/jogar/spribe/aviator"
let URL_CADASTRO = "https://mrg-app-sinais.vercel.app"
let VERSAO_IPHONE_ATUAL = "1.0.1"

struct ControleEnvioEstado {
    var snarpyPausado: Bool = false
    var hyperPausado: Bool = false
    var atualizacaoIphone: Bool = false
    var versaoMinimaIphone: String = "1.0.1"
    var mensagemAtualizacao: String = ""
    var linkIphone: String = ""
}

struct SinalItem: Identifiable {
    let id: Int
    let categoria: String
    let alvo: String
    let horario: String
    let janela: String
    let ativo: Bool
    let status: String
    let resultado: String
}

struct ContentView: View {
    @State private var email = ""
    @State private var senha = ""
    @State private var loginMsg = "Entre com o e-mail e senha cadastrados."
    @State private var logado = false
    @State private var usuarioEmail = ""
    @State private var accessToken = ""
    @State private var sessionToken = ""
    @State private var deviceId = UserDefaults.standard.string(forKey: "mrg_iphone_device_id") ?? ""

    @State private var horaAtual = "--:--:--"
    @State private var sinaisAtivos: [SinalItem] = []
    @State private var historico: [SinalItem] = []
    @State private var leituraAoVivo = "Aguardando leitura..."
    @State private var projecoes = "Aguardando projeções..."
    @State private var rosasAtual = 0
    @State private var rosasHistorico = "Aguardando contagem de rosas..."
    @State private var controle = ControleEnvioEstado()

    @State private var mostrarModal = false
    @State private var modalTitulo = ""
    @State private var modalTexto = ""
    @State private var recarregarWebView = UUID()

    let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()
    let dadosTimer = Timer.publish(every: 2.5, on: .main, in: .common).autoconnect()

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if logado {
                VStack(spacing: 0) {
                    painelTopoMRG
                    AviatorWebView(url: URL(string: URL_AVIATOR)!, reloadId: recarregarWebView)
                        .background(Color.black)
                }
                .ignoresSafeArea(.keyboard)
            } else {
                telaLogin
            }
        }
        .onAppear {
            prepararDeviceId()
            atualizarHora()
        }
        .onReceive(timer) { _ in atualizarHora() }
        .onReceive(dadosTimer) { _ in
            if logado {
                Task { await atualizarTudo() }
            }
        }
        .alert(modalTitulo, isPresented: $mostrarModal) {
            Button("FECHAR", role: .cancel) {}
        } message: {
            Text(modalTexto)
        }
    }

    var telaLogin: some View {
        VStack(spacing: 10) {
            Text("MRG SINAIS ALTO PADRÃO")
                .foregroundColor(.green)
                .font(.system(size: 22, weight: .bold))

            Text("MRG EXTERMINADOR DE SINAIS · iPHONE \(VERSAO_IPHONE_ATUAL)")
                .foregroundColor(.yellow)
                .font(.system(size: 12, weight: .bold))

            TextField("E-mail", text: $email)
                .keyboardType(.emailAddress)
                .autocapitalization(.none)
                .textFieldStyleMRG()

            SecureField("Senha", text: $senha)
                .textFieldStyleMRG()

            Button("ENTRAR") {
                Task { await tentarLogin() }
            }
            .buttonStyleMRG(fill: .green, text: .black)

            Button("CRIAR CONTA") { abrirCadastro() }
                .buttonStyleMRG(fill: Color(red: 0.08, green: 0.08, blue: 0.08), text: .white)

            Button("ESQUECI MINHA SENHA") { abrirCadastro() }
                .buttonStyleMRG(fill: Color(red: 0.08, green: 0.08, blue: 0.08), text: .white)

            Text(loginMsg)
                .foregroundColor(loginMsg.uppercased().contains("ERRO") || loginMsg.uppercased().contains("BLOQUEADO") ? .red : .yellow)
                .font(.system(size: 13, weight: .semibold))
                .multilineTextAlignment(.center)
                .padding(.top, 8)
                .frame(minHeight: 60)
        }
        .padding(24)
    }

    var painelTopoMRG: some View {
        VStack(spacing: 2) {
            Text("MRG EXTERMINADOR DE SINAIS")
                .foregroundColor(.green)
                .font(.system(size: 15, weight: .bold))
                .frame(height: 22)

            HStack(spacing: 4) {
                ForEach(cardsSinaisTopo()) { s in
                    VStack(spacing: 1) {
                        Text("\(s.categoria)  \(s.alvo)")
                            .foregroundColor(Color(red: 0.85, green: 1.0, blue: 0.0))
                            .font(.system(size: cardsSinaisTopo().count > 1 ? 14 : 18, weight: .bold))
                            .lineLimit(1)
                        Text("HORÁRIO \(s.horario)")
                            .foregroundColor(.white)
                            .font(.system(size: 9, weight: .semibold))
                            .lineLimit(1)
                        Text("JANELA \(s.janela)")
                            .foregroundColor(.white.opacity(0.85))
                            .font(.system(size: 9, weight: .semibold))
                            .lineLimit(1)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 58)
                    .background(Color.black.opacity(0.95))
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color(red: 1.0, green: 0.1, blue: 0.72), lineWidth: 1.3))
                    .cornerRadius(8)
                }
            }
            .padding(.horizontal, 4)

            HStack(spacing: 0) {
                resumoText("ACERTOS \(contar("ACERTO"))", .green)
                resumoText("PROTEÇÕES \(contar("PROTECAO"))", .yellow)
                resumoText("ERROS \(contar("ERRO"))", .red)
                resumoText("CHEIA \(taxaCheia())%", .green)
                resumoText("OPER.\(taxaOperacional())%", .yellow)
            }
            .frame(height: 23)

            HStack(spacing: 4) {
                VStack(alignment: .leading, spacing: 3) {
                    Text("AO VIVO")
                        .foregroundColor(Color(red: 1.0, green: 0.2, blue: 0.52))
                        .font(.system(size: 8, weight: .bold))
                    Text(leituraAoVivo)
                        .foregroundColor(.white)
                        .font(.system(size: 10, weight: .bold))
                        .lineLimit(3)
                        .minimumScaleFactor(0.75)
                }
                .padding(.horizontal, 6)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                .background(Color.black.opacity(0.96))
                .overlay(RoundedRectangle(cornerRadius: 7).stroke(.green, lineWidth: 1.3))
                .cornerRadius(7)
                .onTapGesture { abrirModal("LEITURA AO VIVO", leituraAoVivo) }

                VStack(spacing: 4) {
                    HStack(spacing: 4) {
                        botaoPequeno("PROJEÇÕES") { abrirModal("PROJEÇÕES FUTURAS", projecoes) }
                        botaoPequeno("SINAIS") { abrirModal("HISTÓRICO RECENTE", historicoTexto()) }
                        Button("⟳") {
                            recarregarWebView = UUID()
                            Task { await atualizarTudo() }
                        }
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(.green)
                        .frame(width: 42, height: 34)
                        .background(Color(red: 0.07, green: 0.07, blue: 0.07))
                        .overlay(RoundedRectangle(cornerRadius: 7).stroke(.green, lineWidth: 1.3))
                        .cornerRadius(7)
                    }

                    HStack(spacing: 4) {
                        Text(horaAtual)
                            .foregroundColor(.green)
                            .font(.system(size: 24, weight: .bold))
                            .minimumScaleFactor(0.8)
                            .frame(maxWidth: .infinity, maxHeight: 34)
                            .background(Color.black)
                            .overlay(RoundedRectangle(cornerRadius: 8).stroke(.green, lineWidth: 1.3))
                            .cornerRadius(8)

                        Button(action: { abrirModal("🌹 ROSAS POR HORA", rosasHistorico) }) {
                            HStack(spacing: 3) {
                                Text("🌹").font(.system(size: 20))
                                Text("\(rosasAtual)").font(.system(size: 22, weight: .bold))
                            }
                            .foregroundColor(Color(red: 1.0, green: 0.38, blue: 0.82))
                            .frame(width: 68, height: 34)
                            .background(Color.black)
                            .overlay(RoundedRectangle(cornerRadius: 8).stroke(.green, lineWidth: 1.3))
                            .cornerRadius(8)
                        }
                    }
                }
                .frame(width: 206)
            }
            .frame(height: 72)
            .padding(.horizontal, 4)
            .padding(.bottom, 2)
        }
        .background(Color.black)
    }

    func resumoText(_ text: String, _ color: Color) -> some View {
        Text(text)
            .foregroundColor(color)
            .font(.system(size: 9, weight: .bold))
            .lineLimit(1)
            .minimumScaleFactor(0.6)
            .frame(maxWidth: .infinity)
    }

    func botaoPequeno(_ text: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(text)
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity, maxHeight: 34)
        }
        .background(Color(red: 0.07, green: 0.07, blue: 0.07))
        .overlay(RoundedRectangle(cornerRadius: 7).stroke(.green, lineWidth: 1.3))
        .cornerRadius(7)
    }

    func prepararDeviceId() {
        if deviceId.isEmpty {
            deviceId = "IPHONE-\(UUID().uuidString)"
            UserDefaults.standard.set(deviceId, forKey: "mrg_iphone_device_id")
        }
    }

    func atualizarHora() {
        let f = DateFormatter()
        f.locale = Locale(identifier: "pt_BR")
        f.dateFormat = "HH:mm:ss"
        horaAtual = f.string(from: Date())
    }

    func abrirModal(_ titulo: String, _ texto: String) {
        modalTitulo = titulo
        modalTexto = texto.isEmpty ? "Sem dados." : texto
        mostrarModal = true
    }

    func abrirCadastro() {
        if let url = URL(string: URL_CADASTRO) {
            UIApplication.shared.open(url)
        }
    }

    func cardsSinaisTopo() -> [SinalItem] {
        if sinaisAtivos.isEmpty {
            if controle.snarpyPausado && controle.hyperPausado {
                return [SinalItem(id: -1, categoria: "MRG", alvo: "PAUSADO", horario: "--:--", janela: "--", ativo: true, status: "", resultado: "")]
            }
            return [SinalItem(id: -1, categoria: "AGUARDANDO", alvo: "SINAL", horario: "--:--", janela: "--:-- até --:--", ativo: true, status: "", resultado: "")]
        }
        return Array(sinaisAtivos.prefix(2))
    }

    func contar(_ tipo: String) -> Int {
        historico.prefix(5).filter { statusNormalizado($0) == tipo }.count
    }

    func taxaCheia() -> Int {
        let total = max(1, historico.prefix(5).count)
        return Int((Double(contar("ACERTO")) / Double(total)) * 100.0)
    }

    func taxaOperacional() -> Int {
        let total = max(1, historico.prefix(5).count)
        return Int((Double(contar("ACERTO") + contar("PROTECAO")) / Double(total)) * 100.0)
    }

    func statusNormalizado(_ s: SinalItem) -> String {
        let t = "\(s.status) \(s.resultado)".uppercased()
        if t.contains("PROTECAO") || t.contains("PROTEÇÃO") || t.contains("PARCIAL") { return "PROTECAO" }
        if t.contains("ACERTO") { return "ACERTO" }
        if t.contains("ERRO") { return "ERRO" }
        return "OUTRO"
    }

    func historicoTexto() -> String {
        if historico.isEmpty { return "Nenhum sinal resolvido ainda." }
        return historico.prefix(10).enumerated().map { idx, s in
            "\(idx+1)) \(s.categoria) \(s.alvo) | \(s.resultado.isEmpty ? s.status : s.resultado)\nHorário: \(s.horario)\nJanela: \(s.janela)"
        }.joined(separator: "\n\n")
    }

    func tentarLogin() async {
        let e = email.trimmingCharacters(in: .whitespacesAndNewlines)
        let p = senha.trimmingCharacters(in: .whitespacesAndNewlines)
        if e.isEmpty || p.isEmpty {
            loginMsg = "Informe e-mail e senha."
            return
        }
        loginMsg = "Verificando acesso..."

        do {
            let token = try await supabaseLogin(email: e, senha: p)
            accessToken = token
            let liberado = try await verificarPerfil(email: e)
            if !liberado {
                loginMsg = "Acesso bloqueado por pendência de pagamento.\nVerifique com o administrador."
                return
            }
            try await registrarSessao(email: e)
            usuarioEmail = e
            logado = true
            await atualizarTudo()
        } catch {
            loginMsg = "Erro ao verificar acesso.\n\(error.localizedDescription)"
        }
    }

    func atualizarTudo() async {
        do {
            if !usuarioEmail.isEmpty {
                let liberado = try await verificarPerfil(email: usuarioEmail)
                if !liberado {
                    await MainActor.run { 
                        logado = false
                        loginMsg = "Acesso bloqueado por pendência de pagamento."
                    }
                    return
                }
                try? await atualizarPing()
            }
            try await carregarControle()
            try await carregarSinais()
            try await carregarLeitura()
            try await carregarProjecoes()
            try await carregarRosas()
        } catch {
            print("MRG atualizarTudo erro:", error)
        }
    }

    // MARK: - Supabase REST

    func authHeader() -> String {
        accessToken.isEmpty ? "Bearer \(SUPABASE_KEY)" : "Bearer \(accessToken)"
    }

    func request(path: String, method: String = "GET", body: Data? = nil, auth: Bool = true, prefer: String? = nil) async throws -> Data {
        guard let url = URL(string: SUPABASE_URL + path) else { throw URLError(.badURL) }
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue(SUPABASE_KEY, forHTTPHeaderField: "apikey")
        req.setValue(auth ? authHeader() : "Bearer \(SUPABASE_KEY)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("no-cache", forHTTPHeaderField: "Cache-Control")
        if let prefer { req.setValue(prefer, forHTTPHeaderField: "Prefer") }
        req.httpBody = body
        let (data, response) = try await URLSession.shared.data(for: req)
        let code = (response as? HTTPURLResponse)?.statusCode ?? 0
        if code < 200 || code > 299 {
            let text = String(data: data, encoding: .utf8) ?? ""
            throw NSError(domain: "Supabase", code: code, userInfo: [NSLocalizedDescriptionKey: text])
        }
        return data
    }

    func supabaseLogin(email: String, senha: String) async throws -> String {
        let body = try JSONSerialization.data(withJSONObject: ["email": email, "password": senha])
        let data = try await request(path: "/auth/v1/token?grant_type=password", method: "POST", body: body, auth: false)
        let obj = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard let token = obj?["access_token"] as? String, !token.isEmpty else {
            throw NSError(domain: "Login", code: 1, userInfo: [NSLocalizedDescriptionKey: "Token ausente."])
        }
        return token
    }

    func verificarPerfil(email: String) async throws -> Bool {
        let emailFiltro = email.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? email
        let data = try await request(path: "/rest/v1/perfis?select=*&email=eq.\(emailFiltro)&limit=1")
        let arr = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] ?? []
        guard let perfil = arr.first else { return false }
        return boolFlex(perfil["liberado"], false)
    }

    func registrarSessao(email: String) async throws {
        sessionToken = UUID().uuidString
        let obj: [String: Any] = [
            "email": email,
            "session_token": sessionToken,
            "device_id": deviceId,
            "plataforma": "IPHONE",
            "ativo": true,
            "ultimo_login": ISO8601DateFormatter().string(from: Date()),
            "ultimo_ping": ISO8601DateFormatter().string(from: Date())
        ]
        let body = try JSONSerialization.data(withJSONObject: obj)
        _ = try await request(path: "/rest/v1/sessoes_ativas?on_conflict=email", method: "POST", body: body, prefer: "resolution=merge-duplicates,return=minimal")
    }

    func atualizarPing() async throws {
        guard !usuarioEmail.isEmpty, !sessionToken.isEmpty else { return }
        let emailFiltro = usuarioEmail.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? usuarioEmail
        let tokenFiltro = sessionToken.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? sessionToken
        let body = try JSONSerialization.data(withJSONObject: ["ultimo_ping": ISO8601DateFormatter().string(from: Date())])
        _ = try await request(path: "/rest/v1/sessoes_ativas?email=eq.\(emailFiltro)&session_token=eq.\(tokenFiltro)", method: "PATCH", body: body, prefer: "return=minimal")
    }

    func carregarControle() async throws {
        let data = try await request(path: "/rest/v1/controle_envio?select=*&id=eq.1&limit=1")
        let arr = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] ?? []
        guard let obj = arr.first else { return }
        let snarpyAtivo = boolFlex(obj["snarpy_ativo"], true)
        let hyperAtivo = boolFlex(obj["hyper_ativo"], true)
        controle = ControleEnvioEstado(
            snarpyPausado: !snarpyAtivo,
            hyperPausado: !hyperAtivo,
            atualizacaoIphone: boolFlex(obj["atualizacao_iphone"], false),
            versaoMinimaIphone: String(describing: obj["versao_minima_iphone"] ?? "1.0.1"),
            mensagemAtualizacao: String(describing: obj["mensagem_atualizacao"] ?? ""),
            linkIphone: String(describing: obj["link_iphone"] ?? "")
        )
    }

    func carregarSinais() async throws {
        let ativosData = try await request(path: "/rest/v1/sinais?select=*&ativo=eq.true&order=id.desc&limit=3")
        let fechadosData = try await request(path: "/rest/v1/sinais?select=*&ativo=eq.false&order=id.desc&limit=10")
        let ativosRaw = try JSONSerialization.jsonObject(with: ativosData) as? [[String: Any]] ?? []
        let fechadosRaw = try JSONSerialization.jsonObject(with: fechadosData) as? [[String: Any]] ?? []

        let ativos = ativosRaw.map(parseSinal).filter { s in
            if s.categoria.uppercased().contains("SNARPY") && controle.snarpyPausado { return false }
            if s.categoria.uppercased().contains("HYPER") && controle.hyperPausado { return false }
            return true
        }.sorted { horarioValor($0.horario) < horarioValor($1.horario) }

        sinaisAtivos = ativos
        historico = fechadosRaw.map(parseSinal)
    }

    func carregarLeitura() async throws {
        let data = try await request(path: "/rest/v1/leituras_ao_vivo?select=*&ativo=eq.true&order=id.desc&limit=3")
        let arr = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] ?? []
        var linhas: [String] = []
        for item in arr {
            let msg = String(describing: item["mensagem"] ?? "")
                .replacingOccurrences(of: "\n", with: " | ")
                .replacingOccurrences(of: "SNIPER", with: "SNARPY")
                .replacingOccurrences(of: "HYPER 1000", with: "HYPER1000")
                .replacingOccurrences(of: "HYPER 100", with: "HYPER100")
            for parte in msg.components(separatedBy: "|") {
                let p = parte.trimmingCharacters(in: .whitespacesAndNewlines)
                if !p.isEmpty && linhas.count < 3 { linhas.append(p) }
            }
            if linhas.count >= 3 { break }
        }
        leituraAoVivo = linhas.isEmpty ? "Aguardando leitura..." : linhas.joined(separator: "\n")
    }

    func carregarProjecoes() async throws {
        let data = try await request(path: "/rest/v1/projecoes_mercado?select=*&ativo=eq.true&order=id.desc&limit=1")
        let arr = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] ?? []
        projecoes = String(describing: arr.first?["mensagem"] ?? "Aguardando projeções...")
    }

    func carregarRosas() async throws {
        do {
            let data = try await request(path: "/rest/v1/rosas_por_hora_app?select=*&order=hora_inicio.desc&limit=12")
            let arr = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] ?? []
            if arr.isEmpty { rosasAtual = 0; rosasHistorico = "Aguardando contagem de rosas."; return }
            let atualKey = horaKeyAtual()
            var atual = 0
            var linhas: [String] = []
            for obj in arr {
                let horaInicio = String(describing: obj["hora_inicio"] ?? obj["hora"] ?? obj["faixa"] ?? "")
                let qtd = intFlex(obj["quantidade"] ?? obj["total"] ?? obj["qtd"], 0)
                if horaInicio.count >= 13 && String(horaInicio.prefix(13)) == atualKey { atual = qtd }
                let horaCurta: String
                if horaInicio.count >= 13 {
                    let start = horaInicio.index(horaInicio.startIndex, offsetBy: 11)
                    let end = horaInicio.index(horaInicio.startIndex, offsetBy: 13)
                    horaCurta = "\(horaInicio[start..<end]):00"
                } else {
                    horaCurta = "--:--"
                }
                linhas.append("\(horaCurta)    ➜    🌹 \(qtd)")
            }
            rosasAtual = atual
            rosasHistorico = linhas.joined(separator: "\n")
        } catch {
            rosasAtual = 0
        }
    }

    func parseSinal(_ obj: [String: Any]) -> SinalItem {
        let rawCat = String(describing: obj["categoria"] ?? obj["origem"] ?? obj["tipo"] ?? "MRG").uppercased()
        let cat = rawCat.contains("SNARPY") || rawCat.contains("SNIPER") ? "SNARPY" : (rawCat.contains("HYPER") ? "HYPER" : "MRG")
        return SinalItem(
            id: intFlex(obj["id"], Int.random(in: 1...999999)),
            categoria: cat,
            alvo: String(describing: obj["alvo"] ?? "-"),
            horario: String(describing: obj["horario"] ?? "--:--"),
            janela: String(describing: obj["janela"] ?? "--"),
            ativo: boolFlex(obj["ativo"], false),
            status: String(describing: obj["status"] ?? ""),
            resultado: String(describing: obj["resultado"] ?? "")
        )
    }

    func boolFlex(_ value: Any?, _ padrao: Bool) -> Bool {
        guard let value else { return padrao }
        if let b = value as? Bool { return b }
        if let n = value as? NSNumber { return n.intValue != 0 }
        let t = String(describing: value).trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if ["true","1","sim","ativo","liberado","yes","on"].contains(t) { return true }
        if ["false","0","nao","não","pausado","bloqueado","no","off"].contains(t) { return false }
        return padrao
    }

    func intFlex(_ value: Any?, _ padrao: Int) -> Int {
        guard let value else { return padrao }
        if let n = value as? Int { return n }
        if let n = value as? NSNumber { return n.intValue }
        return Int(String(describing: value)) ?? padrao
    }

    func horarioValor(_ h: String) -> Int {
        let p = h.split(separator: ":").map { Int($0) ?? 0 }
        if p.count < 2 { return 999999 }
        return (p[0] * 3600) + (p[1] * 60) + (p.count > 2 ? p[2] : 0)
    }

    func horaKeyAtual() -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "pt_BR")
        f.dateFormat = "yyyy-MM-dd HH"
        return f.string(from: Date())
    }
}

struct AviatorWebView: UIViewRepresentable {
    let url: URL
    let reloadId: UUID

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.preferences.javaScriptCanOpenWindowsAutomatically = true
        config.websiteDataStore = .default()

        let web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = context.coordinator
        web.uiDelegate = context.coordinator
        web.scrollView.bounces = false
        web.scrollView.backgroundColor = .black
        web.backgroundColor = .black
        web.isOpaque = false
        web.allowsBackForwardNavigationGestures = true
        web.load(URLRequest(url: url))
        return web
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        if context.coordinator.lastReloadId != reloadId {
            context.coordinator.lastReloadId = reloadId
            webView.reload()
        }
    }

    func makeCoordinator() -> Coordinator { Coordinator() }

    class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        var lastReloadId = UUID()

        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            // Mantém popups dentro do mesmo WKWebView.
            if navigationAction.targetFrame == nil {
                webView.load(navigationAction.request)
            }
            return nil
        }

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            decisionHandler(.allow)
        }
    }
}

extension View {
    func textFieldStyleMRG() -> some View {
        self
            .padding(.horizontal, 12)
            .frame(height: 48)
            .background(Color(red: 0.04, green: 0.04, blue: 0.04))
            .foregroundColor(.white)
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.gray.opacity(0.7), lineWidth: 1))
            .cornerRadius(10)
    }

    func buttonStyleMRG(fill: Color, text: Color) -> some View {
        self
            .frame(height: 46)
            .frame(maxWidth: .infinity)
            .background(fill)
            .foregroundColor(text)
            .font(.system(size: 14, weight: .bold))
            .cornerRadius(10)
    }
}
