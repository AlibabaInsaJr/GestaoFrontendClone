import { TestBed } from '@angular/core/testing';

import { AquisicaoService } from './aquicicao.service';

describe('AquicicaoService', () => {
  let service: AquisicaoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AquisicaoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
