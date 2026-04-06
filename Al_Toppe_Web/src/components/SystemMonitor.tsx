import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { RefreshCw, Server, Database, Cpu, HardDrive, Network, Monitor } from 'lucide-react';
import { apiService } from '../services/api';

export function SystemMonitor() {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchMetrics = async () => {
        try {
            const data = await apiService.getAdminMonitoring();

            //   const response = await fetch('/api/admin/monitoring/');
            //   const data = await response.json();
            setMetrics(data);
        } catch (error) {
            console.error('Erreur surveillance:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();

        if (autoRefresh) {
            const interval = setInterval(fetchMetrics, 10000); // Refresh toutes les 10s
            return () => clearInterval(interval);
        }
    }, [autoRefresh]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'healthy': return 'bg-green-100 text-green-800';
            case 'warning': return 'bg-yellow-100 text-yellow-800';
            case 'unhealthy': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-center">
                        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                        Chargement des métriques...
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!metrics) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="text-center text-red-600">
                        Impossible de charger les métriques système
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* En-tête avec contrôles */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Surveillance Système</h2>
                <div className="flex space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchMetrics}
                        disabled={loading}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Actualiser
                    </Button>
                    <Button
                        variant={autoRefresh ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAutoRefresh(!autoRefresh)}
                    >
                        Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
                    </Button>
                </div>
            </div>

            {/* Métriques système */}
    // Dans votre SystemMonitor.jsx - affichage des métriques hôte
            {metrics.host && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* CPU Hôte */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">CPU Hôte</CardTitle>
                            <Cpu className="w-4 h-4 text-gray-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{metrics.host.cpu?.percent}%</div>
                            <p className="text-xs text-gray-600">
                                Load: {metrics.host.cpu?.load_avg}
                            </p>
                            <Badge className={`mt-2 ${getStatusColor(metrics.host.cpu?.status)}`}>
                                {metrics.host.cpu?.status}
                            </Badge>
                        </CardContent>
                    </Card>

                    {/* Mémoire Hôte */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Mémoire Hôte</CardTitle>
                            <Server className="w-4 h-4 text-gray-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{metrics.host.memory?.percent}%</div>
                            <p className="text-xs text-gray-600">
                                {metrics.host.memory?.usage}
                            </p>
                            <Badge className={`mt-2 ${getStatusColor(metrics.host.memory?.status)}`}>
                                {metrics.host.memory?.status}
                            </Badge>
                        </CardContent>
                    </Card>

                    {/* Disque Hôte */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Disque Hôte</CardTitle>
                            <HardDrive className="w-4 h-4 text-gray-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{metrics.host.disk?.percent}%</div>
                            <p className="text-xs text-gray-600">
                                {metrics.host.disk?.usage}
                            </p>
                            <Badge className={`mt-2 ${getStatusColor(metrics.host.disk?.status)}`}>
                                {metrics.host.disk?.status}
                            </Badge>
                        </CardContent>
                    </Card>

                    {/* Système */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Système</CardTitle>
                            <Monitor className="w-4 h-4 text-gray-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm font-medium">{metrics.host.system?.hostname}</div>
                            <p className="text-xs text-gray-600">
                                {metrics.host.system?.uptime}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Services */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Database className="w-5 h-5 mr-2" />
                        Statut des Services
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {Object.entries(metrics.services).map(([service, status]) => (
                            <div key={service} className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                    <p className="font-medium capitalize">{service}</p>
                                    <p className="text-sm text-gray-600">
                                        {status.response_time ? `${(status.response_time * 1000).toFixed(0)}ms` : 'N/A'}
                                    </p>
                                </div>
                                <Badge className={getStatusColor(status.status)}>
                                    {status.status}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Containers Docker */}
            <Card>
                <CardHeader>
                    <CardTitle>Containers Docker</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {metrics.docker.containers.map(container => (
                            <div key={container.name} className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                    <p className="font-medium">{container.name}</p>
                                    <p className="text-sm text-gray-600">{container.status}</p>
                                </div>
                                <Badge className={container.healthy ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                    {container.healthy ? 'Healthy' : 'Warning'}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Timestamp */}
            <div className="text-sm text-gray-600 text-center">
                Dernière mise à jour: {new Date(metrics.timestamp).toLocaleString('fr-FR')}
            </div>
        </div>
    );
}