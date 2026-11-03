"""Serve dist under /ember/ to exercise the same base path as GitHub Pages."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import socket


class BuildHandler(SimpleHTTPRequestHandler):
    offline = False
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory='dist', **kwargs)

    def do_GET(self):
        if BuildHandler.offline:
            self.close_connection = True
            try:
                self.connection.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass
            return
        if not self.path.startswith('/ember/'):
            self.send_error(404)
            return
        self.path = self.path[len('/ember'):]
        super().do_GET()

    def do_POST(self):
        # Test-only control on a loopback-bound server. Simulate a real network
        # failure so WebKit's setOffline emulation cannot reject SW responses.
        if self.path != '/_test/network':
            self.send_error(404)
            return
        state = self.rfile.read(min(16, int(self.headers.get('Content-Length', 0))))
        if state not in (b'online', b'offline'):
            self.send_error(400)
            return
        BuildHandler.offline = state == b'offline'
        self.send_response(204)
        self.end_headers()

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    ThreadingHTTPServer(('127.0.0.1', 4173), BuildHandler).serve_forever()
