<?php

require_once __DIR__ . '/vendor/autoload.php';

// Note that this example requires amphp/http-server-router,
// amphp/http-server-static-content and amphp/log to be installed.

use Amp\Http\Server\HttpServer;
use Amp\Http\Server\Request;
use Amp\Http\Server\Response;
use Amp\Http\Server\Router;
use Amp\Http\Server\StaticContent\DocumentRoot;
use Amp\Log\ConsoleFormatter;
use Amp\Log\StreamHandler;
use Amp\Loop;
use Amp\Promise;
use Amp\Socket\Server as SocketServer;
use Amp\Success;
use Amp\Websocket\Client;
use Amp\Websocket\Message;
use Amp\Websocket\Server\ClientHandler;
use Amp\Websocket\Server\Gateway;
use Amp\Websocket\Server\Websocket;
use Monolog\Logger;
use function Amp\ByteStream\getStdout;


class ClientHandlerClass implements ClientHandler
{
    public ?string $watcherId = null;
    public bool $sendEnable = false;
    public int $sendDelay = 100;
    private int $channels = 1;
    private int $randSize = 10;
    private ?Client $client = null;
    private Logger $logger;

    public function __construct(Logger $logger)
    {
        $this->logger = $logger;
    }

    public function handleHandshake(Gateway $gateway, Request $request, Response $response): Promise
    {
        //if (!\in_array($request->getHeader('origin'), ['http://localhost:1337', 'http://127.0.0.1:1337', 'http://[::1]:1337'], true)) {
        //    return $gateway->getErrorHandler()->handleError(Status::FORBIDDEN, 'Origin forbidden', $request);
        //}

        return new Success($response);
    }

    public function handleSend(): callable
    {
        return function () {
            if ($this->client instanceof Client) {
                $rand = rand(1, $this->randSize);
                for ($i = 1; $i <= $rand; $i++) {
                    $randChannel = rand(1, $this->channels);

                    $this->client->send(json_encode([
                        'response' => [
                            'test' => 'channel-' . $randChannel . ' rand: ' . $rand
                        ],
                        'callbackName' => 'channel-' . $randChannel
                    ], true));
                }
            }
        };
    }


    public function handleClient(Gateway $gateway, Client $client, Request $request, Response $response): Promise
    {
        return Amp\call(function () use ($gateway, $client) {
            while ($message = yield $client->receive()) {
                $this->client = $client;

                if ($message instanceof Message) {
                    $json = json_decode(yield $message->buffer(), true);

                    if (isset($json['sendEnable'], $json['sendDelay'], $json['channels'], $json['randSize'])) {
                        $this->sendEnable = $json['sendEnable'];
                        $this->sendDelay = $json['sendDelay'];
                        $this->channels = $json['channels'];
                        $this->randSize = $json['randSize'];

                        posix_kill(posix_getpid(), SIGUSR1);
                        posix_kill(posix_getpid(), SIGUSR2);

                        $client->send(json_encode(['response' => 'ok', 'callbackName' => null], true));

                        $this->logger->info('Update settings', $json);
                    }
                }
            }
        });
    }
}

Loop::run(function (): Promise {

    $logHandler = new StreamHandler(getStdout());
    $logHandler->setFormatter(new ConsoleFormatter);

    $logger = new Logger('server');
    $logger->pushHandler($logHandler);

    $clientHandler = new ClientHandlerClass($logger);
    $websocket = new Websocket($clientHandler);

    Loop::onSignal(SIGUSR1, function () use ($clientHandler) {
        if ($clientHandler->watcherId !== null) {
            Loop::disable($clientHandler->watcherId);
        }

        $clientHandler->watcherId = Loop::repeat($clientHandler->sendDelay, $clientHandler->handleSend());
    });

    Loop::onSignal(SIGUSR2, function () use ($clientHandler) {
        if ($clientHandler->sendEnable) {
            Loop::enable($clientHandler->watcherId);
        } else {
            Loop::disable($clientHandler->watcherId);
        }
    });

    $sockets = [
        SocketServer::listen('0.0.0.0:80'),
//        SocketServer::listen('[::1]:80'),
    ];

    $router = new Router();
    $router->addRoute('GET', '/live', $websocket);
    $router->setFallback(new DocumentRoot(__DIR__ . '/public'));


    $server = new HttpServer($sockets, $router, $logger);

    return $server->start();
});
