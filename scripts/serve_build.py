"""Serve dist under /ember/ to exercise the same base path as GitHub Pages."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class BuildHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory='dist', **kwargs)

    def do_GET(self):
        if not self.path.startswith('/ember/'):
            self.send_error(404)
            return
        self.path = self.path[len('/ember'):]
        super().do_GET()

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    ThreadingHTTPServer(('127.0.0.1', 4173), BuildHandler).serve_forever()
